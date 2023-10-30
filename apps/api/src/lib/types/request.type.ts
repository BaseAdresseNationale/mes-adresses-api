import { Request } from 'express';
import { Numero } from '@/shared/schemas/numero/numero.schema';
import { Voie } from '@/modules/voie/schema/voie.schema';
import { Toponyme } from '@/shared/schemas/toponyme/toponyme.schema';
import { BaseLocale } from '@/modules/base_locale/schema/base_locale.schema';

export interface CustomRequest extends Request {
  token?: string;
  isAdmin?: boolean;
  numero?: Numero;
  toponyme?: Toponyme;
  baseLocale: BaseLocale;
  voie?: Voie;
}
