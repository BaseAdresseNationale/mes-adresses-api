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

import { LineString } from '@/shared/schemas/geometry/line_string.schema';
import { TypeNumerotationEnum } from '@/shared/schemas/voie/type_numerotation.enum';

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
