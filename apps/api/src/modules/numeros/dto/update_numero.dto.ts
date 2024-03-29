import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { Types } from 'mongoose';
import {
  MaxLength,
  IsMongoId,
  Validate,
  IsOptional,
  ValidateNested,
  ArrayNotEmpty,
} from 'class-validator';

import { Position } from '@/shared/schemas/position.schema';
import { ValidatorBal } from '@/shared/validators/validator_bal.validator';

export class UpdateNumeroDTO {
  @IsOptional()
  @Validate(ValidatorBal, ['numero'])
  @ApiProperty({ required: false, nullable: false })
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
  @IsMongoId()
  @ApiProperty({ type: String, required: false, nullable: false })
  voie?: Types.ObjectId;

  @IsOptional()
  @Validate(ValidatorBal, ['cad_parcelles'])
  @ApiProperty({ required: false, nullable: false })
  parcelles?: string[];

  @IsOptional()
  @ApiProperty({ required: false, nullable: false })
  certifie?: boolean;

  @IsOptional()
  @ValidateNested({ each: true, message: 'positions must be an array' })
  @ArrayNotEmpty()
  @Type(() => Position)
  @ApiProperty({
    type: () => Position,
    isArray: true,
    required: false,
    nullable: false,
  })
  positions?: Position[];
}
