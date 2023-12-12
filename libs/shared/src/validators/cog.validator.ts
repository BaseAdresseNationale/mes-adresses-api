import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { getCommune } from '../utils/cog.utils';

@ValidatorConstraint({ name: 'validatorCogCommune' })
export class ValidatorCogCommune implements ValidatorConstraintInterface {
  constructor() {}

  validate(commune: string) {
    return Boolean(getCommune(commune));
  }

  defaultMessage(args: ValidationArguments) {
    const field = args.constraints[0];
    return 'Le champ ' + field + ' : ' + args.value + " n'est pas valide";
  }
}
