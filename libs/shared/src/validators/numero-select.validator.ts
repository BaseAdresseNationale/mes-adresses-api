import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

import { Numero } from '../entities/numero.entity';

// Whitelist des champs autorisés dans le paramètre `select` de l'endpoint
// `numeroComplet` est un champ virtuel calculé côté entité (@AfterLoad) à
// partir de `numero` et `suffixe`; il est développé côté service.
export const ALLOWED_NUMERO_SELECT_FIELDS: ReadonlySet<string> = new Set<
  keyof Numero
>([
  'id',
  'banId',
  'balId',
  'voieId',
  'toponymeId',
  'numero',
  'suffixe',
  'numeroComplet',
  'comment',
  'parcelles',
  'certifie',
  'communeDeleguee',
  'createdAt',
  'updatedAt',
  'deletedAt',
]);

@ValidatorConstraint({ name: 'numeroSelectField', async: false })
export class NumeroSelectFieldValidator
  implements ValidatorConstraintInterface
{
  validate(value: unknown): boolean {
    return typeof value === 'string' && ALLOWED_NUMERO_SELECT_FIELDS.has(value);
  }

  defaultMessage(args: ValidationArguments): string {
    return `Le champ "${args.value}" n'est pas un champ autorisé du numero`;
  }
}
