import { Request } from 'express';

import { Numero } from '@/shared/entities/numero.entity';
import { Voie } from '@/shared/entities/voie.entity';
import { Toponyme } from '@/shared/schemas/toponyme/toponyme.schema';
import { BaseLocale } from '@/shared/schemas/base_locale/base_locale.schema';

export interface CustomRequest extends Request {
  token?: string;
  isAdmin?: boolean;
  numero?: Numero;
  toponyme?: Toponyme;
  baseLocale: BaseLocale;
  voie?: Voie;
}
