import { ApiProperty } from '@nestjs/swagger';

import { Numero } from '@/shared/schemas/numero/numero.schema';
import { BaseLocale } from '@/shared/schemas/base_locale/base_locale.schema';

export class ExtendedBaseLocale extends BaseLocale {
  @ApiProperty()
  nbNumeros?: number;

  @ApiProperty()
  nbNumerosCertifies?: number;

  @ApiProperty()
  isAllCertified?: boolean;

  @ApiProperty()
  commentedNumeros?: Numero[];
}
