import { Request } from 'express';

import { Numero } from '@/shared/entities/numero.entity';
import { Voie } from '@/shared/entities/voie.entity';
import { Toponyme } from '@/shared/entities/toponyme.entity';
import { BaseLocale } from '@/shared/entities/base_locale.entity';

export interface CustomRequest extends Request {
  token?: string;
  isAdmin?: boolean;
  numero?: Numero;
  toponyme?: Toponyme;
  baseLocale: BaseLocale;
  voie?: Voie;
}
