import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { getCommuneActuelle, isCommuneAncienne } from '../utils/cog.utils';

@ValidatorConstraint({ name: 'validatorCogCommune' })
export class ValidatorCogCommune implements ValidatorConstraintInterface {
  constructor() {}

  validate(commune: string, args: ValidationArguments) {
    const field = args.constraints[0];
    if (field === 'commune') {
      return Boolean(getCommuneActuelle(commune));
    } else if (field === 'commune_deleguee') {
      return commune ? isCommuneAncienne(commune) : true;
    }
  }

  defaultMessage(args: ValidationArguments) {
    const field = args.constraints[0];
    return 'Le champ ' + field + ' : ' + args.value + " n'est pas valide";
  }
}
