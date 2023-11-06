import { ApiProperty, IntersectionType } from '@nestjs/swagger';

import { Numero } from '@/shared/schemas/numero/numero.schema';
import { BaseLocale } from '@/shared/schemas/base_locale/base_locale.schema';
import { WithMetaNumeros } from '@/lib/types/with_meta_numeros.type';

export class ExtendedBaseLocale extends IntersectionType(
  BaseLocale,
  WithMetaNumeros,
) {}
