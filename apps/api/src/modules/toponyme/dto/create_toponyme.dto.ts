import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  Validate,
  IsOptional,
  ValidateNested,
  IsNotEmptyObject,
} from 'class-validator';

import { ValidatorBal } from '@/shared/validators/validator_bal.validator';
import { Position } from '@/shared/schemas/position.schema';

export class CreateToponymeDTO {
  @Validate(ValidatorBal, ['nom'])
  @ApiProperty({ required: true, nullable: false })
  nom: string;

  @IsOptional()
  @IsNotEmptyObject()
  @Validate(ValidatorBal, ['langAlt'])
  @ApiProperty({ required: false, nullable: true })
  nomAlt: Record<string, string>;

  @IsOptional()
  @Validate(ValidatorBal, ['cad_parcelles'])
  @ApiProperty({ required: false, nullable: true })
  parcelles?: string[];

  @IsOptional()
  @ValidateNested({ each: true, message: 'positions must be an array' })
  @Type(() => Position)
  @ApiProperty({
    type: () => Position,
    isArray: true,
    required: false,
    nullable: false,
  })
  positions?: Position[];
}
