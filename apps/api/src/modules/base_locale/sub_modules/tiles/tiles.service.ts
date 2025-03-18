import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { tileToBBOX } from '@mapbox/tilebelt';

import { VoieService } from '@/modules/voie/voie.service';
import { NumeroInBbox, NumeroService } from '@/modules/numeros/numero.service';
import { GeoJsonCollectionType } from '@/modules/base_locale/sub_modules/tiles/types/features.type';
import { ZOOM } from '@/modules/base_locale/sub_modules/tiles/const/zoom.const';
import { getGeoJson } from '@/modules/base_locale/sub_modules/tiles/utils/geojson.utils';

@Injectable()
export class TilesService {
  constructor(
    @Inject(forwardRef(() => VoieService))
    private voieService: VoieService,
    @Inject(forwardRef(() => NumeroService))
    private numeroService: NumeroService,
  ) {}

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

    const numeros: NumeroInBbox[] =
      z >= ZOOM.NUMEROS_ZOOM.minZoom && z <= ZOOM.NUMEROS_ZOOM.maxZoom
        ? await this.numeroService.findManyWherePositionInBBox(balId, bbox)
        : [];

    return getGeoJson(voies, traces, numeros, colorblindMode);
  }
}
