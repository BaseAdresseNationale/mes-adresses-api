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

function roundCoordinate(coordinate: number, precision: number = 6): number {
  return Number.parseFloat(coordinate.toFixed(precision));
}

export function calcMetaTilesNumero(
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

export async function calcMetaTilesVoie(voie: Voie, numeros: Numero[]) {
  voie.centroid = null;
  voie.centroidTiles = null;
  voie.traceTiles = null;

  try {
    if (voie.typeNumerotation === TypeNumerotationEnum.METRIQUE && voie.trace) {
      voie.centroid = turf.centroid(voie.trace);
      voie.centroidTiles = getTilesByPosition(
        voie.centroid.geometry,
        ZOOM.VOIE_ZOOM,
      );
      voie.traceTiles = getTilesByLineString(voie.trace);
    } else {
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
    }
  } catch (error) {
    console.error(error, voie);
  }

  return voie;
}

export function getParentTile(tile, zoomFind) {
  return tile[2] <= zoomFind ? tile : getParentTile(getParent(tile), zoomFind);
}

function getTilesByPosition(
  point: Point,
  { minZoom, maxZoom } = ZOOM.NUMEROS_ZOOM,
): string[] {
  if (!point || !minZoom || !maxZoom) {
    return null;
  }

  const lon: number = roundCoordinate(point.coordinates[0], 6);
  const lat: number = roundCoordinate(point.coordinates[1], 6);

  const tiles: string[] = range(minZoom, maxZoom + 1).map((zoom) => {
    const [x, y, z]: number[] = pointToTile(lon, lat, zoom);
    return `${z}/${x}/${y}`;
  });

  return tiles;
}

function getTilesByLineString(
  lineString: LineStringTurf,
  { zoom } = ZOOM.TRACE_MONGO_ZOOM,
): string[] {
  const bboxFeature: BboxTurf = turf.bbox(lineString);
  const [x, y, z]: number[] = bboxToTile(bboxFeature);
  const tiles: string[] = getTilesByBbox([x, y, z], lineString, zoom);
  return tiles;
}

function getTilesByBbox(
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
        tiles.push(...getTilesByBbox(childTile, geojson, zoom));
      }
    }
  } else {
    const parentTile = getParent([x, y, z]);
    tiles.push(...getTilesByBbox(parentTile, geojson, zoom));
  }

  return union(tiles);
}
