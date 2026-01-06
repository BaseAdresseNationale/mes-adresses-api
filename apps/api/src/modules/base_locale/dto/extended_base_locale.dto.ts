import { BaseLocale } from '@/shared/entities/base_locale.entity';
import { ApiProperty, OmitType } from '@nestjs/swagger';

export class ExtendedBaseLocaleDTO extends BaseLocale {
  @ApiProperty()
  nbNumeros?: number;

  @ApiProperty()
  nbNumerosCertifies?: number;

  @ApiProperty()
  isAllCertified?: boolean;

  @ApiProperty()
  isHabilitationValid?: boolean;
}

export class BaseLocaleWithHabilitationDTO extends OmitType(
  ExtendedBaseLocaleDTO,
  ['token', 'emails'],
) {
  @ApiProperty()
  isHabilitationValid?: boolean;
}
