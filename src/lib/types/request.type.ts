import { Request } from 'express';
import { Numero } from '@/modules/numeros/schema/numero.schema';
import { Voie } from '@/modules/voie/schema/voie.schema';
import { Toponyme } from '@/modules/toponyme/schema/toponyme.schema';

export interface CustomRequest extends Request {
  token?: string;
  isAdmin?: boolean;
  numero?: Numero;
  toponyme?: Toponyme;
  voie?: Voie;
}
