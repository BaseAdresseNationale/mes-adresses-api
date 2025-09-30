import { Point } from 'geojson';

export type ToponymeInBox = {
  id: string;
  nom: string;
  point: Point;
};
