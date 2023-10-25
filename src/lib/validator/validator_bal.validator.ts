import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { getLabel, readValue } from '@ban-team/validateur-bal';
// const languesRegionales = require('@ban-team/shared-data/langues-regionales.json')
const languesRegionales = [];
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
      if (
        ['numero', 'suffixe', 'position', 'source', 'nom_voie'].includes(field)
      ) {
        const { errors } = await validateurBAL(value.toString(), field);
        return errors.length === 0;
      } else if (field === 'cad_parcelles') {
        const { errors } = await validateurBAL(value.join('|'), field);
        return errors.length === 0;
      } else if (field === 'nom_alt_voie') {
        Object.keys(value).forEach(async (codeISO) => {
          if (supportedNomAlt.has(codeISO)) {
            const nomVoie = value[codeISO];
            const { errors } = await validateurBAL(nomVoie, 'voie_nom');
            return errors.length === 0;
          } else {
            return false;
          }
        });
      }
    } catch {
      return false;
    }

    return true;
  }

  defaultMessage(args: ValidationArguments) {
    const field = args.constraints[0];
    return 'Le champ ' + field + ' : ' + args.value + " n'est pas valide";
  }
}
