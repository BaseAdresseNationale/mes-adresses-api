import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { tileToBBOX, pointToTile } from '@mapbox/tilebelt';
import * as geojsonvt from 'geojson-vt';
import * as vtpbf from 'vt-pbf';
import * as zlib from 'zlib';
import { promisify } from 'util';

import { VoieService } from '@/modules/voie/voie.service';
import { NumeroService } from '@/modules/numeros/numero.service';
import { GeoJsonCollectionType } from '@/modules/base_locale/sub_modules/tiles/types/features.type';
import { ZOOM } from '@/modules/base_locale/sub_modules/tiles/const/zoom.const';
import { getGeoJson } from '@/modules/base_locale/sub_modules/tiles/utils/geojson.utils';
import { RedisService } from '@/shared/modules/redis/redis.service';
import { Point } from '@turf/turf';

const gzip = promisify(zlib.gzip);

@Injectable()
export class TilesService {
  constructor(
    @Inject(forwardRef(() => VoieService))
    private voieService: VoieService,
    @Inject(forwardRef(() => NumeroService))
    private numeroService: NumeroService,
    private redisService: RedisService,
  ) {}

  public getTileCacheKey(balId: string, tile: number[]): string {
    return `tile:${balId}:${tile.join('/')}`;
  }

  public async removeTileCacheFromPoints(balId: string, points: Point[]) {
    const tiles = new Set<number[]>();
    for (const point of points) {
      const [long, lat] = point.coordinates;
      for (
        let zoom = ZOOM.VOIE_ZOOM.minZoom;
        zoom <= ZOOM.VOIE_ZOOM.maxZoom;
        zoom++
      ) {
        tiles.add(pointToTile(long, lat, zoom));
      }
    }

    for (const tile of Array.from(tiles)) {
      const key = this.getTileCacheKey(balId, tile);
      await this.redisService.del(key);
    }
  }

  public async getGeoJsonByTile(
    balId: string,
    tile: number[],
    colorblindMode: boolean,
  ): Promise<GeoJsonCollectionType> {
    const z: number = tile[2];
    const bbox: number[] = tileToBBOX(tile);

    const voies =
      z >= ZOOM.VOIE_ZOOM.minZoom && z <= ZOOM.VOIE_ZOOM.maxZoom
        ? await this.voieService.findManyWhereCentroidInBBox(balId, bbox)
        : [];

    const traces =
      z >= ZOOM.TRACE_ZOOM.minZoom && z <= ZOOM.TRACE_ZOOM.maxZoom
        ? await this.voieService.findManyWhereTraceInBBox(balId, bbox)
        : [];

    const numeros =
      z >= ZOOM.NUMEROS_ZOOM.minZoom && z <= ZOOM.NUMEROS_ZOOM.maxZoom
        ? await this.numeroService.findManyWherePositionInBBox(balId, bbox)
        : [];

    return getGeoJson(voies, traces, numeros, colorblindMode);
  }

  public async getPdfTile(
    balId: string,
    tile: number[],
    colorblindMode: boolean,
  ): Promise<Buffer | undefined> {
    const key = this.getTileCacheKey(balId, tile);
    const isCaching = await this.redisService.exists(key);

    if (isCaching === 0) {
      const {
        numeroPoints,
        voiePoints,
        voieLineStrings,
      }: GeoJsonCollectionType = await this.getGeoJsonByTile(
        balId,
        tile,
        colorblindMode,
      );
      const options = { maxZoom: 20 };
      const numerosTiles = geojsonvt(numeroPoints, options).getTile(
        tile[2],
        tile[0],
        tile[1],
      );
      const voieTiles = geojsonvt(voiePoints, options).getTile(
        tile[2],
        tile[0],
        tile[1],
      );
      const voieTraceTiles = geojsonvt(voieLineStrings, options).getTile(
        tile[2],
        tile[0],
        tile[1],
      );

      if (!numerosTiles && !voieTiles && !voieTraceTiles) {
        return undefined;
      }

      const sourcesLayers = {
        ...(numerosTiles && { 'numeros-points': numerosTiles }),
        ...(voieTiles && { 'voies-points': voieTiles }),
        ...(voieTraceTiles && { 'voies-linestrings': voieTraceTiles }),
      };

      const pbf = vtpbf.fromGeojsonVt(sourcesLayers);

      const compressedPbf = await gzip(Buffer.from(pbf));
      this.redisService.setFile(key, compressedPbf);
      return compressedPbf;
    } else {
      return await this.redisService.getFile(key);
    }
  }
}
