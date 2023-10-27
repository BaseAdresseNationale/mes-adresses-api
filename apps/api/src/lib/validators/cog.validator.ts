import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { keyBy } from 'lodash';
import * as communes from '@etalab/decoupage-administratif/data/communes.json';
import { CommuneCOG } from '../types/cog.type';

@ValidatorConstraint({ name: 'validatorCogCommune' })
export class ValidatorCogCommune implements ValidatorConstraintInterface {
  private filteredCommunes: CommuneCOG[];
  private communesIndex: Record<string, CommuneCOG>;

  constructor() {
    this.filteredCommunes = (communes as Array<any>).filter((c) =>
      ['commune-actuelle', 'arrondissement-municipal'].includes(c.type),
    );
    this.communesIndex = keyBy(this.filteredCommunes, 'code');
  }
  validate(commune: string) {
    return Boolean(this.communesIndex[commune]);
  }

  defaultMessage(args: ValidationArguments) {
    const field = args.constraints[0];
    return 'Le champ ' + field + ' : ' + args.value + " n'est pas valide";
  }
}
