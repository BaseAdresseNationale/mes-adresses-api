import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { tileToBBOX } from '@mapbox/tilebelt';

import { VoieService } from '@/modules/voie/voie.service';
import { NumeroService } from '@/modules/numeros/numero.service';
import { GeoJsonCollectionType } from '@/modules/base_locale/sub_modules/tiles/types/features.type';
import { ZOOM } from '@/modules/base_locale/sub_modules/tiles/const/zoom.const';
import { getGeoJson } from '@/modules/base_locale/sub_modules/tiles/utils/geojson.utils';
import { ToponymeService } from '@/modules/toponyme/toponyme.service';

@Injectable()
export class TilesService {
  constructor(
    @Inject(forwardRef(() => VoieService))
    private voieService: VoieService,
    @Inject(forwardRef(() => NumeroService))
    private numeroService: NumeroService,
    @Inject(forwardRef(() => ToponymeService))
    private toponymeService: ToponymeService,
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

    const numeros =
      z >= ZOOM.NUMEROS_ZOOM.minZoom && z <= ZOOM.NUMEROS_ZOOM.maxZoom
        ? await this.numeroService.findManyWherePositionInBBox(balId, bbox)
        : [];

    const toponymes =
      z >= ZOOM.TOPONYME_ZOOM.minZoom && z <= ZOOM.TOPONYME_ZOOM.maxZoom
        ? await this.toponymeService.findManyWherePositionInBBox(balId, bbox)
        : [];

    return getGeoJson(voies, traces, numeros, toponymes, colorblindMode);
  }
}
