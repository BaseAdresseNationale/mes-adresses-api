import { BaseLocale } from '@/shared/entities/base_locale.entity';
import { Numero } from '@/shared/entities/numero.entity';
import { ApiProperty } from '@nestjs/swagger';

export class ExtendedBaseLocaleDTO extends BaseLocale {
  @ApiProperty()
  nbNumeros?: number;

  @ApiProperty()
  nbNumerosCertifies?: number;

  @ApiProperty()
  isAllCertified?: boolean;

  @ApiProperty()
  commentedNumeros?: Numero[];
}
