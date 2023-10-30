import { Numero } from '../schemas/numero/numero.schema';
import { NumeroPopulate } from '../schemas/numero/numero.populate';

export function displaySuffix(numero: Numero): string {
  if (numero.suffixe) {
    if (numero.suffixe.trim().match(/^\d/)) {
      return '-' + numero.suffixe.trim();
    }
    return numero.suffixe.trim();
  }

  return '';
}

export function filterSensitiveFields(
  numero: Numero | NumeroPopulate,
  filter: boolean = true,
): Numero | NumeroPopulate {
  if (filter && numero.comment) {
    numero.comment = null;
  }
  return numero;
}

export function normalizeSuffixe(suffixe: string): string {
  return suffixe.toLowerCase().trim();
}
