import { ApiProperty } from '@nestjs/swagger';
import { ExtendedBaseLocale } from './extended_base_locale';
import { Type } from 'class-transformer';

export class PageBaseLocaleDTO {
  @ApiProperty()
  offset?: number;

  @ApiProperty()
  limit?: number;

  @ApiProperty()
  count?: number;

  @Type(() => ExtendedBaseLocale)
  @ApiProperty({
    type: () => ExtendedBaseLocale,
    isArray: true,
  })
  results?: Omit<ExtendedBaseLocale, 'token' | 'emails'>[];
}
