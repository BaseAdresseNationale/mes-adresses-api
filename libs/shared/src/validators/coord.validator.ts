import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import * as proj from '@etalab/project-legal';
import { getLabel, readValue } from '@ban-team/validateur-bal';
import { Point } from '@turf/turf';

async function validateurBAL(value, label) {
  const { errors } = await readValue(label, value);

  return {
    errors: errors.map((error) => getLabel(`${label}.${error}`)),
  };
}

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

  defaultMessage() {
    return " Les coordonnées du point ne sont pas valides. Contactez nous sur adresse@data.gouv.fr avec l'objet 'Mauvaise positions' pour nous aider à corriger le bug";
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

          const latResults = await validateurBAL(lat.toString(), 'lat');
          if (latResults.errors.length > 0) {
            return false;
          }

          const longResults = await validateurBAL(long.toString(), 'long');
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
