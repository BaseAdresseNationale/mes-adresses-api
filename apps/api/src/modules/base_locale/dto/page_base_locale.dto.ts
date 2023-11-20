import { ApiProperty } from '@nestjs/swagger';
import { ExtendedBaseLocaleDTO } from './extended_base_locale.dto';
import { Type } from 'class-transformer';

export class PageBaseLocaleDTO {
  @ApiProperty()
  offset?: number;

  @ApiProperty()
  limit?: number;

  @ApiProperty()
  count?: number;

  @Type(() => ExtendedBaseLocaleDTO)
  @ApiProperty({
    type: () => ExtendedBaseLocaleDTO,
    isArray: true,
  })
  results?: Omit<ExtendedBaseLocaleDTO, 'token' | 'emails'>[];
}
