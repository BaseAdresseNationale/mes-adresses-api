import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import * as proj from '@etalab/project-legal';
import { Point } from '@turf/turf';
import { getValidateurBalColumnErrors } from '../utils/validateur-bal.utils';

function harmlessProj(coordinates: number[]) {
  try {
    return proj(coordinates);
  } catch {}
}

@ValidatorConstraint({ name: 'pointCoord', async: true })
export class PointValidator implements ValidatorConstraintInterface {
  async validate(point: Point) {
    if (Array.isArray(point.coordinates) && point.coordinates.length === 2) {
      if (
        typeof point.coordinates[0] !== 'number' ||
        typeof point.coordinates[1] !== 'number'
      ) {
        return false;
      }
      const projectedCoordInMeters = harmlessProj(point.coordinates);
      if (!projectedCoordInMeters) {
        return false;
      }
    } else {
      return false;
    }

    return true;
  }
}

@ValidatorConstraint({ name: 'lineStringCoord', async: true })
export class LineStringValidator implements ValidatorConstraintInterface {
  async validate(coordinates: any) {
    if (Array.isArray(coordinates)) {
      for (const coor of coordinates) {
        if (Array.isArray(coor)) {
          const [lat, long] = coor;
          if (typeof lat !== 'number' || typeof long !== 'number') {
            return false;
          }

          const latResults = await getValidateurBalColumnErrors(
            'lat',
            lat.toString(),
          );
          if (latResults.errors.length > 0) {
            return false;
          }

          const longResults = await getValidateurBalColumnErrors(
            'long',
            long.toString(),
          );
          if (longResults.errors.length > 0) {
            return false;
          }
        }
      }
    } else {
      return false;
    }

    return true;
  }

  defaultMessage() {
    return 'Les coordonnées de la lineString ne sont pas valide';
  }
}

@ValidatorConstraint({ name: 'polygonCoord', async: true })
export class PolygonValidator implements ValidatorConstraintInterface {
  async validate(coordinates: any) {
    if (!Array.isArray(coordinates) || coordinates.length < 4) {
      return false;
    }

    for (const coor of coordinates) {
      if (!Array.isArray(coor) || coor.length !== 2) {
        return false;
      }

      const [lat, long] = coor;
      if (typeof lat !== 'number' || typeof long !== 'number') {
        return false;
      }

      const latResults = await getValidateurBalColumnErrors(
        'lat',
        lat.toString(),
      );
      if (latResults.errors.length > 0) {
        return false;
      }

      const longResults = await getValidateurBalColumnErrors(
        'long',
        long.toString(),
      );
      if (longResults.errors.length > 0) {
        return false;
      }
    }

    const [firstLat, firstLong] = coordinates[0];
    const [lastLat, lastLong] = coordinates[coordinates.length - 1];
    if (firstLat !== lastLat || firstLong !== lastLong) {
      return false;
    }

    return true;
  }

  defaultMessage() {
    return 'Les coordonnées du polygon ne sont pas valides';
  }
}
