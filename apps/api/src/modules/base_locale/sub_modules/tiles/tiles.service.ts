import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { Types, FilterQuery } from 'mongoose';
import * as turf from '@turf/turf';
import { Position as PositionTurf } from '@turf/helpers';

import { Numero } from '@/shared/schemas/numero/numero.schema';
import { Voie } from '@/shared/schemas/voie/voie.schema';
import { TypeNumerotationEnum } from '@/shared/schemas/voie/type_numerotation.enum';

import { VoieService } from '@/modules/voie/voie.service';
import { NumeroService } from '@/modules/numeros/numero.service';
import { getPriorityPosition } from '@/lib/utils/positions.util';
import {
  TileType,
  ModelsInTileType,
  GeoJsonCollectionType,
} from '@/modules/base_locale/sub_modules/tiles/types/features.type';
import { ZOOM } from '@/modules/base_locale/sub_modules/tiles/const/zoom.const';
import { getGeoJson } from '@/modules/base_locale/sub_modules/tiles/utils/geojson.utils';
import {
  getTilesByPosition,
  getTilesByLineString,
  getParentTile,
} from '@/modules/base_locale/sub_modules/tiles/utils/tiles.utils';

@Injectable()
export class TilesService {
  constructor(
    @Inject(forwardRef(() => VoieService))
    private voieService: VoieService,
    @Inject(forwardRef(() => NumeroService))
    private numeroService: NumeroService,
  ) {}

  private async fetchModelsInTile(
    balId: Types.ObjectId,
    { x, y, z }: TileType,
  ): Promise<ModelsInTileType> {
    const fetchs: ModelsInTileType = {
      numeros: [],
      voies: [],
      traces: [],
    };

    if (z >= ZOOM.NUMEROS_ZOOM.minZoom && z <= ZOOM.NUMEROS_ZOOM.maxZoom) {
      const filter: FilterQuery<Numero> = {
        _bal: balId,
        tiles: `${z}/${x}/${y}`,
        _deleted: null,
      };
      fetchs.numeros = await this.numeroService.findMany(filter);
    }

    if (z >= ZOOM.VOIE_ZOOM.minZoom && z <= ZOOM.VOIE_ZOOM.maxZoom) {
      const filter: FilterQuery<Voie> = {
        _bal: balId,
        centroidTiles: `${z}/${x}/${y}`,
        _deleted: null,
      };
      fetchs.voies = await this.voieService.findMany(filter);
    }

    if (
      z >= ZOOM.TRACE_DISPLAY_ZOOM.minZoom &&
      z <= ZOOM.TRACE_DISPLAY_ZOOM.maxZoom
    ) {
      const [xx, yy, zz] = getParentTile([x, y, z], ZOOM.TRACE_MONGO_ZOOM.zoom);
      const filter: FilterQuery<Voie> = {
        _bal: balId,
        typeNumerotation: TypeNumerotationEnum.METRIQUE,
        trace: { $ne: null },
        traceTiles: `${zz}/${xx}/${yy}`,
        _deleted: null,
      };
      fetchs.traces = await this.voieService.findMany(filter);
    }

    return fetchs;
  }

  public async getGeoJsonByTile(
    balId: Types.ObjectId,
    tile: TileType,
    colorblindMode: boolean,
  ): Promise<GeoJsonCollectionType> {
    const modelsInTile: ModelsInTileType = await this.fetchModelsInTile(
      balId,
      tile,
    );
    return getGeoJson(modelsInTile, colorblindMode);
  }

  public async updateVoiesTiles(voieIds: Types.ObjectId[]) {
    const voies = await this.voieService.findMany(
      {
        _id: { $in: voieIds },
        _deleted: null,
      },
      {
        _id: 1,
        centroid: 1,
        centroidTiles: 1,
        typeNumerotation: 1,
        trace: 1,
        traceTiles: 1,
      },
    );

    return Promise.all(voies.map((v) => this.updateVoieTiles(v)));
  }

  public async updateVoieTiles(voie: Voie) {
    const voieSet = await this.calcMetaTilesVoie(voie);
    return this.voieService.updateOne(voie._id, voieSet);
  }

  public calcMetaTilesNumero(
    numero: Numero | Record<string, any>,
  ): Numero | Record<string, any> {
    numero.tiles = null;
    try {
      if (numero.positions && numero.positions.length > 0) {
        const position = getPriorityPosition(numero.positions);
        numero.tiles = getTilesByPosition(position.point, ZOOM.NUMEROS_ZOOM);
      }
    } catch (error) {
      console.error(error, numero);
    }

    return numero;
  }

  public async calcMetaTilesVoie(voie: Voie) {
    voie.centroid = null;
    voie.centroidTiles = null;
    voie.traceTiles = null;

    try {
      if (
        voie.typeNumerotation === TypeNumerotationEnum.METRIQUE &&
        voie.trace
      ) {
        this.calcMetaTilesVoieWithTrace(voie);
      } else {
        const numeros: Numero[] = await this.numeroService.findMany(
          {
            voie: voie._id,
            _deleted: null,
          },
          {
            positions: 1,
          },
        );
        this.calcMetaTilesVoieWithNumeros(voie, numeros);
      }
    } catch (error) {
      console.error(error, voie);
    }

    return voie;
  }

  public calcMetaTilesVoieWithNumeros(voie: Voie, numeros: Numero[]): Voie {
    if (numeros.length > 0) {
      const coordinatesNumeros: PositionTurf[] = numeros
        .filter((n) => n.positions && n.positions.length > 0)
        .map((n) => getPriorityPosition(n.positions)?.point?.coordinates);
      // CALC CENTROID
      if (coordinatesNumeros.length > 0) {
        const collection = turf.featureCollection(
          coordinatesNumeros.map((n) => turf.point(n)),
        );
        voie.centroid = turf.centroid(collection);
        voie.centroidTiles = getTilesByPosition(
          voie.centroid.geometry,
          ZOOM.VOIE_ZOOM,
        );
      }
    }
    return voie;
  }

  public calcMetaTilesVoieWithTrace(voie: Partial<Voie>): Partial<Voie> {
    voie.centroid = turf.centroid(voie.trace);
    voie.centroidTiles = getTilesByPosition(
      voie.centroid.geometry,
      ZOOM.VOIE_ZOOM,
    );
    voie.traceTiles = getTilesByLineString(voie.trace);

    return voie;
  }
}
