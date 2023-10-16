import { Injectable, Inject } from '@nestjs/common';
import * as turf from '@turf/turf';
import booleanIntersects from '@turf/boolean-intersects';
import { range, union } from 'lodash';
import {
  pointToTile,
  bboxToTile,
  getParent,
  getChildren,
  tileToBBOX,
} from '@mapbox/tilebelt';
import { Model } from 'mongoose';
import { InjectModel, getModelToken } from '@nestjs/mongoose';
import { getPriorityPosition } from '../utils/positions.util';
import { Numero } from '@/modules/numeros/schema/numero.schema';
import { Voie } from '@/modules/voie/schema/voie.schema';
import { TypeNumerotationEnum } from '@/modules/voie/schema/type_numerotation.enum';
import { Point } from '@/lib/schemas/geosjon/point.schema';
import {
  LineString as LineStringTurf,
  Position as PositionTurf,
  BBox as BboxTurf,
  Geometry as GeometryTurf,
} from '@turf/helpers';

const ZOOM = {
  NUMEROS_ZOOM: {
    minZoom: 13,
    maxZoom: 19,
  },
  VOIE_ZOOM: {
    minZoom: 13,
    maxZoom: 19,
  },
  TRACE_DISPLAY_ZOOM: {
    minZoom: 13,
    maxZoom: 19,
  },
  TRACE_MONGO_ZOOM: {
    zoom: 13,
  },
};

@Injectable()
export class TilesService {
  constructor(
    @Inject(getModelToken(Numero.name)) private numeroModel: Model<Numero>,
    @InjectModel(Voie.name) private voieModel: Model<Voie>,
  ) {}

  public async updateVoiesTile(voieIds: string[]) {
    const voies: Voie[] = await this.voieModel
      .find({
        _id: { $in: voieIds.map((id) => id) },
        _deleted: null,
      })
      .select({ _id: 1, typeNumerotation: 1, trace: 1 })
      .exec();
    return Promise.all(voies.map((v) => this.updateVoieTile(v)));
  }

  public async updateVoieTile(voie: Voie) {
    const voieSet: Voie = await this.calcMetaTilesVoie(voie);
    return this.voieModel.updateOne({ _id: voie._id }, { $set: voieSet });
  }

  private roundCoordinate(coordinate: number, precision: number = 6): number {
    return Number.parseFloat(coordinate.toFixed(precision));
  }

  public calcMetaTilesNumero(
    numero: Numero | Record<string, any>,
  ): Numero | Record<string, any> {
    numero.tiles = null;
    try {
      if (numero.positions && numero.positions.length > 0) {
        const position = getPriorityPosition(numero.positions);
        numero.tiles = this.getTilesByPosition(
          position.point,
          ZOOM.NUMEROS_ZOOM,
        );
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
        voie.centroid = turf.centroid(voie.trace);
        voie.centroidTiles = this.getTilesByPosition(
          voie.centroid.geometry,
          ZOOM.VOIE_ZOOM,
        );
        voie.traceTiles = this.getTilesByLineString(voie.trace);
      } else {
        const numeros: Numero[] = await this.numeroModel
          .find({ voie: voie._id, _deleted: null })
          .select({ positions: 1, voie: 1 })
          .exec();
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
            voie.centroidTiles = this.getTilesByPosition(
              voie.centroid.geometry,
              ZOOM.VOIE_ZOOM,
            );
          }
        }
      }
    } catch (error) {
      console.error(error, voie);
    }

    return voie;
  }

  public getParentTile(tile, zoomFind) {
    return tile[2] <= zoomFind
      ? tile
      : this.getParentTile(getParent(tile), zoomFind);
  }

  private getTilesByPosition(
    point: Point,
    { minZoom, maxZoom } = ZOOM.NUMEROS_ZOOM,
  ): string[] {
    if (!point || !minZoom || !maxZoom) {
      return null;
    }

    const lon: number = this.roundCoordinate(point.coordinates[0], 6);
    const lat: number = this.roundCoordinate(point.coordinates[1], 6);

    const tiles: string[] = range(minZoom, maxZoom + 1).map((zoom) => {
      const [x, y, z]: number[] = pointToTile(lon, lat, zoom);
      return `${z}/${x}/${y}`;
    });

    return tiles;
  }

  private getTilesByLineString(
    lineString: LineStringTurf,
    { zoom } = ZOOM.TRACE_MONGO_ZOOM,
  ): string[] {
    const bboxFeature: BboxTurf = turf.bbox(lineString);
    const [x, y, z]: number[] = bboxToTile(bboxFeature);
    const tiles: string[] = this.getTilesByBbox([x, y, z], lineString, zoom);
    return tiles;
  }

  private getTilesByBbox(
    [x, y, z]: number[],
    geojson: GeometryTurf,
    zoom,
  ): string[] {
    const tiles = [];
    if (z === zoom) {
      return [`${z}/${x}/${y}`];
    }

    if (z < zoom) {
      const childTiles: number[][] = getChildren([x, y, z]);
      for (const childTile of childTiles) {
        const childTileBbox = tileToBBOX(childTile);
        const bboxPolygon = turf.bboxPolygon(childTileBbox);
        if (booleanIntersects(geojson, bboxPolygon)) {
          tiles.push(...this.getTilesByBbox(childTile, geojson, zoom));
        }
      }
    } else {
      const parentTile = getParent([x, y, z]);
      tiles.push(...this.getTilesByBbox(parentTile, geojson, zoom));
    }

    return union(tiles);
  }
}
