import { Numero } from '@/shared/entities/numero.entity';
import { WithNumero } from '../types/numero.type';

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
