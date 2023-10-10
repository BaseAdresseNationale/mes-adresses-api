
import { ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';
import { getLabel, readValue } from '@ban-team/validateur-bal'

async function validateurBAL(value, label) {
  const {errors} = await readValue(label, value)

  return {
    errors: errors.map(error => getLabel(`${label}.${error}`))
  }
}

@ValidatorConstraint({ name: 'pointCoord', async: true })
export class PointCoordBal implements ValidatorConstraintInterface {
  async validate(coordinates: any) {
    if (Array.isArray(coordinates) && coordinates.length === 2) {
      const [lat, long] = coordinates
      if (typeof lat !== 'number' || typeof long !== 'number') {
        return false
      }

      const latResults = await validateurBAL(lat.toString(), 'lat')
      if (latResults.errors.length > 0) {
        return false
      }

      const longResults = await validateurBAL(long.toString(), 'long')
      if (longResults.errors.length > 0) {
        return false
      }

    } else {
      return false
    }

    return true
  }

  defaultMessage(args: ValidationArguments) {
    return 'Les coordonées du point ne sont pas valide pas valide';
  }
}
