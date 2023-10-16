import { Numero } from './schema/numero.schema';

export function displaySuffix(numero: Numero) {
  if (numero.suffixe) {
    if (numero.suffixe.trim().match(/^\d/)) {
      return '-' + numero.suffixe.trim();
    }
    return numero.suffixe.trim();
  }

  return '';
}

export function filterSensitiveFields(numero: Numero, filter: boolean = true) {
  if (filter) {
    numero.comment = null;
  }
  return numero;
}
