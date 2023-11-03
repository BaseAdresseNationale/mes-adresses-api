import { Numero } from '../schemas/numero/numero.schema';

export type WithNumero<T> = T & {
  nbNumeros: number;
  nbNumerosCertifies: number;
  isAllCertified: boolean;
  commentedNumeros: Numero[];
};
