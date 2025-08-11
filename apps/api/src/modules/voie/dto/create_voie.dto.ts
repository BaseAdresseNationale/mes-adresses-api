import { ApiProperty } from '@nestjs/swagger';
import { ValidatorBal } from '@/shared/validators/validator_bal.validator';
import { Type } from 'class-transformer';
import {
  Validate,
  IsOptional,
  ValidateNested,
  IsNotEmptyObject,
  IsEnum,
  MaxLength,
  IsNotEmpty,
} from 'class-validator';

import { TypeNumerotationEnum } from '@/shared/entities/voie.entity';
import { LineString } from './line_string';

export class CreateVoieDTO {
  @IsNotEmpty({ message: 'voie_nom:Le champ nom est obligatoire' })
  @Validate(ValidatorBal, ['voie_nom'])
  @ApiProperty({ required: true, nullable: false })
  nom: string;

  @IsOptional()
  @IsNotEmptyObject()
  @Validate(ValidatorBal, ['lang_alt'])
  @ApiProperty({ required: false, nullable: true })
  nomAlt: Record<string, string>;

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

  @IsOptional()
  @MaxLength(5000)
  @ApiProperty({ required: false, nullable: true })
  comment?: string;
}
