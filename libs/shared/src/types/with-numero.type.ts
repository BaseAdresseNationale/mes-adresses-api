import { Numero } from '../schemas/numero/numero.schema';
import { BBox as BboxTurf } from '@turf/helpers';

export type WithNumero<T> = T & {
  nbNumeros: number;
  nbNumerosCertifies: number;
  isAllCertified: boolean;
  commentedNumeros: Numero[];
  bbox?: BboxTurf;
};
