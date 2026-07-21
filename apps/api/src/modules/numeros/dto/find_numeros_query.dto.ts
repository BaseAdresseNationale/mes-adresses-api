import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsOptional, Validate } from 'class-validator';

import { NumeroSelectFieldValidator } from '@/shared/validators/numero-select.validator';

export class FindNumerosQueryDTO {
  @ApiPropertyOptional({
    type: String,
    description:
      'Liste (séparée par des virgules) des champs à retourner pour chaque numero',
    example: 'id,numero,suffixe',
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string'
      ? value.split(',').filter((v) => v.length > 0)
      : value,
  )
  @IsArray()
  @Validate(NumeroSelectFieldValidator, { each: true })
  select?: string[];
}
