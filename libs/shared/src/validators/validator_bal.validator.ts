import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import * as languesRegionales from '@ban-team/shared-data/langues-regionales.json';
import { getValidateurBalColumnErrors } from '../utils/validateur-bal.utils';

const supportedNomAlt = new Set(languesRegionales.map((l) => l.code));

@ValidatorConstraint({ name: 'validatorBal', async: true })
export class ValidatorBal implements ValidatorConstraintInterface {
  private lastErrors: {
    numero: string[];
    suffixe: string[];
    position: string[];
    cad_parcelles: string[];
    voie_nom: string[];
    lang_alt: string[];
  } = {
    numero: [],
    suffixe: [],
    position: [],
    cad_parcelles: [],
    voie_nom: [],
    lang_alt: [],
  };

  async validateField(value: any, label: any) {
    const { errors } = await getValidateurBalColumnErrors(label, value);
    this.lastErrors[label] = errors;
    return errors.length === 0;
  }

  async validate(value: any, args: ValidationArguments) {
    if (value === undefined || value === null) return true;
    try {
      const field = args.constraints[0];
      this.lastErrors[field] = [];
      if (['suffixe', 'position', 'voie_nom'].includes(field)) {
        return this.validateField(value.toString(), field);
      } else if (field === 'cad_parcelles') {
        return this.validateField(value.join('|'), field);
      } else if (field === 'lang_alt') {
        for (const codeISO of Object.keys(value)) {
          if (supportedNomAlt.has(codeISO)) {
            const nomVoie = value[codeISO];
            const { errors } = await getValidateurBalColumnErrors(
              'voie_nom',
              nomVoie,
            );
            if (errors.length > 0) {
              this.lastErrors['lang_alt'] = errors;
              return false;
            }
          } else {
            this.lastErrors['lang_alt'] = [
              `Code de langue non supporté: ${codeISO}`,
            ];
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
    if (this.lastErrors[field].length > 0) {
      return this.lastErrors[field]
        .map((error) => `${field}:${error}`)
        .join(', ');
    }
    return 'Erreur de validation inattendue';
  }
}
