import { BaseLocale } from '@/shared/entities/base_locale.entity';
import { ApiProperty } from '@nestjs/swagger';

export class ExtendedBaseLocaleDTO extends BaseLocale {
  @ApiProperty({ isArray: true, type: Number })
  bbox?: number[];

  @ApiProperty()
  nbNumeros?: number;

  @ApiProperty()
  nbNumerosCertifies?: number;

  @ApiProperty()
  isAllCertified?: boolean;
}
