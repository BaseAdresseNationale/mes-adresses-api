import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  MaxLength,
  Validate,
  IsOptional,
  ArrayNotEmpty,
  ValidateNested,
  IsUUID,
} from 'class-validator';

import { ValidatorBal } from '@/shared/validators/validator_bal.validator';
import { Position } from '@/shared/entities/position.entity';

export class CreateNumeroDTO {
  @Validate(ValidatorBal, ['numero'])
  @ApiProperty({ required: true, nullable: false })
  numero?: string;

  @IsOptional()
  @Validate(ValidatorBal, ['suffixe'])
  @ApiProperty({ required: false, nullable: true })
  suffixe?: string;

  @IsOptional()
  @MaxLength(5000)
  @ApiProperty({ required: false, nullable: true })
  comment?: string;

  @IsOptional()
  @IsUUID(4)
  @ApiProperty({ type: String, required: false, nullable: true })
  toponymeId?: string;

  @IsOptional()
  @Validate(ValidatorBal, ['cad_parcelles'])
  @ApiProperty({ required: false, nullable: false })
  parcelles?: string[];

  @IsOptional()
  @ApiProperty({ required: false, nullable: false })
  certifie?: boolean;

  @ValidateNested({ each: true, message: 'positions must be an array' })
  @ArrayNotEmpty()
  @Type(() => Position)
  @ApiProperty({
    type: () => Position,
    isArray: true,
    required: true,
    nullable: false,
  })
  positions?: Position[];
}
