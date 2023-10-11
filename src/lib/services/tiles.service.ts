import { Injectable } from '@nestjs/common';
import turf from '@turf/turf';
import { range, union } from 'lodash';
import {
  pointToTile,
  bboxToTile,
  getParent,
  getChildren,
  tileToBBOX,
} from '@mapbox/tilebelt';
import { getPriorityPosition } from '../utils/positions.util';
import { Numero } from '@/modules/numeros/schema/numero.schema';
import { Position } from '@/lib/schemas/position.schema';
import { Point } from '@/lib/schemas/geosjon/point.schema';

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
  constructor() {}

  // public async updateVoiesTile(voieIds: string[]) {
  //   const voies = await mongo.db
  //     .collection('voies')
  //     .find({
  //       _id: { $in: voieIds.map((id) => mongo.parseObjectID(id)) },
  //       _deleted: null,
  //     })
  //     .project({ _id: 1, typeNumerotation: 1, trace: 1 })
  //     .toArray();
  //   return Promise.all(voies.map((v) => this.updateVoieTile(v)));
  // }

  // public async updateVoieTile(voie) {
  //   const _id = mongo.parseObjectID(voie._id);
  //   const voieSet = await this.calcMetaTilesVoie(voie);
  //   return mongo.db.collection('voies').updateOne({ _id }, { $set: voieSet });
  // }

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

  // public async calcMetaTilesVoie(voie) {
  //   voie.centroid = null;
  //   voie.centroidTiles = null;
  //   voie.traceTiles = null;

  //   try {
  //     if (voie.typeNumerotation === 'metrique' && voie.trace) {
  //       voie.centroid = turf.centroid(voie.trace);
  //       voie.centroidTiles = this.getTilesByPosition(
  //         voie.centroid.geometry,
  //         ZOOM.VOIE_ZOOM,
  //       );
  //       voie.traceTiles = this.getTilesByLineString(voie.trace);
  //     } else {
  //       const numeros = await mongo.db
  //         .collection('numeros')
  //         .find({ voie: voie._id, _deleted: null })
  //         .project({ positions: 1, voie: 1 })
  //         .toArray();
  //       if (numeros.length > 0) {
  //         const coordinatesNumeros = numeros
  //           .filter((n) => n.positions && n.positions.length > 0)
  //           .map((n) => getPriorityPosition(n.positions)?.point?.coordinates);
  //         // CALC CENTROID
  //         if (coordinatesNumeros.length > 0) {
  //           const featureCollection = turf.featureCollection(
  //             coordinatesNumeros.map((n) => turf.point(n)),
  //           );
  //           voie.centroid = turf.centroid(featureCollection);
  //           voie.centroidTiles = this.getTilesByPosition(
  //             voie.centroid.geometry,
  //             ZOOM.VOIE_ZOOM,
  //           );
  //         }
  //       }
  //     }
  //   } catch (error) {
  //     console.error(error, voie);
  //   }

  //   return voie;
  // }

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

  // private getTilesByLineString(lineString, { zoom } = ZOOM.TRACE_MONGO_ZOOM) {
  //   const bboxFeature = turf.bbox(lineString);
  //   const [x, y, z] = bboxToTile(bboxFeature);
  //   const tiles = this.getTilesByBbox([x, y, z], lineString, zoom);
  //   return tiles;
  // }

  // private getTilesByBbox([x, y, z], geojson, zoom) {
  //   const tiles = [];
  //   if (z === zoom) {
  //     return [`${z}/${x}/${y}`];
  //   }

  //   if (z < zoom) {
  //     const childTiles = getChildren([x, y, z]);
  //     for (const childTile of childTiles) {
  //       const childTileBbox = tileToBBOX(childTile);
  //       const bboxPolygon = turf.bboxPolygon(childTileBbox);
  //       if (turf.booleanIntersects(geojson, bboxPolygon)) {
  //         tiles.push(...this.getTilesByBbox(childTile, geojson, zoom));
  //       }
  //     }
  //   } else {
  //     const parentTile = getParent([x, y, z]);
  //     tiles.push(...this.getTilesByBbox(parentTile, geojson, zoom));
  //   }

  //   return union(tiles);
  // }
}
