import { Numero } from '@/shared/schemas/numero/numero.schema';

export class WithMetaNumeros {
  nbNumeros: number;
  nbNumerosCertifies: number;
  isAllCertified: boolean;
  commentedNumeros: Numero[];
}
