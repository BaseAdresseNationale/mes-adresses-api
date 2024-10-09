import { ApiProperty } from '@nestjs/swagger';
import { ValidatorBal } from '@/shared/validators/validator_bal.validator';
import { Type } from 'class-transformer';
import {
  Validate,
  IsOptional,
  ValidateNested,
  IsNotEmptyObject,
  IsEnum,
} from 'class-validator';

import { TypeNumerotationEnum } from '@/shared/entities/voie.entity';
import { LineString } from './line_string';
import { ValidatorCogCommune } from '@/shared/validators/cog.validator';

export class UpdateVoieDTO {
  @IsOptional()
  @Validate(ValidatorBal, ['nom'])
  @ApiProperty({ required: false, nullable: false })
  nom: string;

  @IsOptional()
  @IsNotEmptyObject()
  @Validate(ValidatorBal, ['langAlt'])
  @ApiProperty({ required: false, nullable: true })
  nomAlt: Record<string, string>;

  @Validate(ValidatorCogCommune, ['commune_deleguee'], {})
  @ApiProperty({ required: false, nullable: true })
  communeDeleguee: string;

  @IsOptional()
  @IsEnum(TypeNumerotationEnum)
  @ApiProperty({ required: false, nullable: false, enum: TypeNumerotationEnum })
  typeNumerotation: TypeNumerotationEnum;

  @IsOptional()
  @ValidateNested()
  @Type(() => LineString)
  @ApiProperty({
    type: () => LineString,
    required: false,
    nullable: false,
  })
  trace: LineString;
}
