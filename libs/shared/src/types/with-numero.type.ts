import { Numero } from '../entities/numero.entity';

export type WithNumero<T> = T & {
  nbNumeros: number;
  nbNumerosCertifies: number;
  isAllCertified: boolean;
  commentedNumeros: Numero[];
};
