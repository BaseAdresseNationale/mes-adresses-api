import { Numero } from '../entities/numero.entity';
import { WithNumero } from '../types/with-numero.type';

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
  numero: Numero,
  filter: boolean = true,
): Numero {
  if (filter && numero.comment) {
    numero.comment = null;
  }
  return numero;
}

export function normalizeSuffixe(suffixe: string): string {
  return suffixe.toLowerCase().trim();
}

export function extendWithNumeros<T>(
  entity: T,
  numeros: Numero[],
): WithNumero<T> {
  const nbNumerosCertifies = numeros.filter((n) => n.certifie === true).length;

  const extendedEntity = {
    ...entity,
    nbNumeros: numeros.length,
    nbNumerosCertifies: nbNumerosCertifies,
    isAllCertified: numeros.length > 0 && numeros.length === nbNumerosCertifies,
    commentedNumeros: numeros.filter(
      (n) => n.comment !== undefined && n.comment !== null && n.comment !== '',
    ),
  } as WithNumero<T>;

  return extendedEntity;
}
