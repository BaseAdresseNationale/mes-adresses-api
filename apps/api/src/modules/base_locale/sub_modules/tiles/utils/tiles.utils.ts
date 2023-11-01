import * as turf from '@turf/turf';
import booleanIntersects from '@turf/boolean-intersects';
import { range, union } from 'lodash';
import {
  LineString as LineStringTurf,
  BBox as BboxTurf,
  Geometry as GeometryTurf,
} from '@turf/helpers';
import {
  pointToTile,
  bboxToTile,
  getParent,
  getChildren,
  tileToBBOX,
} from '@mapbox/tilebelt';

import { Point } from '@/shared/schemas/geometry/point.schema';

import { ZOOM } from '@/modules/base_locale/sub_modules/tiles/const/zoom.const';

export function getParentTile(tile, zoomFind) {
  return tile[2] <= zoomFind ? tile : getParentTile(getParent(tile), zoomFind);
}

export function getTilesByPosition(
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

export function getTilesByLineString(
  lineString: LineStringTurf,
  { zoom } = ZOOM.TRACE_MONGO_ZOOM,
): string[] {
  const bboxFeature: BboxTurf = turf.bbox(lineString);
  const [x, y, z]: number[] = bboxToTile(bboxFeature);
  const tiles: string[] = this.getTilesByBbox([x, y, z], lineString, zoom);
  return tiles;
}

export function getTilesByBbox(
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

export function roundCoordinate(
  coordinate: number,
  precision: number = 6,
): number {
  return Number.parseFloat(coordinate.toFixed(precision));
}
