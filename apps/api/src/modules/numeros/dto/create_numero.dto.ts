import { ApiProperty } from '@nestjs/swagger';
import { Position } from '@/shared/schemas/position.schema';
import { Types } from 'mongoose';
import { Type } from 'class-transformer';
import {
  MaxLength,
  IsMongoId,
  Validate,
  IsOptional,
  ArrayNotEmpty,
  ValidateNested,
} from 'class-validator';

import { ValidatorBal } from '@/shared/validators/validator_bal.validator';

export class CreateNumeroDTO {
  @Validate(ValidatorBal, ['numero'])
  @ApiProperty({ required: true, nullable: false })
  numero?: number;

  @IsOptional()
  @Validate(ValidatorBal, ['suffixe'])
  @ApiProperty({ required: false, nullable: true })
  suffixe?: string;

  @IsOptional()
  @MaxLength(5000)
  @ApiProperty({ required: false, nullable: true })
  comment?: string;

  @IsOptional()
  @IsMongoId()
  @ApiProperty({ type: String, required: false, nullable: true })
  toponyme?: Types.ObjectId;

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
