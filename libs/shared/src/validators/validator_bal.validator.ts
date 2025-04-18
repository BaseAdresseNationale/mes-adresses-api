import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { getLabel, readValue } from '@ban-team/validateur-bal';
import * as languesRegionales from '@ban-team/shared-data/langues-regionales.json';

const supportedNomAlt = new Set(languesRegionales.map((l) => l.code));

async function validateurBAL(value, label) {
  const { errors } = await readValue(label, value);

  return {
    errors: errors.map((error) => getLabel(`${label}.${error}`)),
  };
}

@ValidatorConstraint({ name: 'validatorBal', async: true })
export class ValidatorBal implements ValidatorConstraintInterface {
  async validate(value: any, args: ValidationArguments) {
    try {
      const field = args.constraints[0];
      if (['numero', 'suffixe', 'position', 'source'].includes(field)) {
        const { errors } = await validateurBAL(value.toString(), field);
        return errors.length === 0;
      } else if (field === 'cad_parcelles') {
        const { errors } = await validateurBAL(value.join('|'), field);
        return errors.length === 0;
      } else if (field === 'nom') {
        const { errors } = await validateurBAL(value.toString(), 'voie_nom');
        return errors.length === 0;
      } else if (field === 'langAlt') {
        for (const codeISO of Object.keys(value)) {
          if (supportedNomAlt.has(codeISO)) {
            const nomVoie = value[codeISO];
            const { errors } = await validateurBAL(nomVoie, 'voie_nom');
            if (errors.length > 0) {
              return false;
            }
          } else {
            return false;
          }
        }
        return true;
      }
    } catch {
      return false;
    }

    return true;
  }

  defaultMessage(args: ValidationArguments) {
    const field = args.constraints[0];
    return field === 'langAlt'
      ? "Le champ de langue régionale n'est pas valide"
      : `Le champ ${field} : ${args.value} n'est pas valide`;
  }
}
