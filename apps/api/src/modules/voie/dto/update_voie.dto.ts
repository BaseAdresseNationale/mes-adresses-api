import { ApiProperty } from '@nestjs/swagger';
import { ValidatorBal } from '@/lib/validators/validator_bal.validator';
import { Type } from 'class-transformer';
import {
  Validate,
  IsOptional,
  ValidateNested,
  IsNotEmptyObject,
  IsEnum,
} from 'class-validator';
import { LineString } from '@/lib/schemas/geometry/line_string.schema';
import { TypeNumerotationEnum } from '../schema/type_numerotation.enum';

export class UpdateVoieDto {
  @IsOptional()
  @Validate(ValidatorBal, ['nom_voie'])
  @ApiProperty({ required: false, nullable: false })
  nom: string;

  @IsOptional()
  @IsNotEmptyObject()
  @Validate(ValidatorBal, ['nom_alt_voie'])
  @ApiProperty({ required: false, nullable: true })
  nomAlt: Record<string, string>;

  @IsOptional()
  @IsEnum(TypeNumerotationEnum)
  @ApiProperty({ required: false, nullable: false })
  typeNumerotation: TypeNumerotationEnum;

  @IsNotEmptyObject()
  @ValidateNested()
  @Type(() => LineString)
  @ApiProperty({
    type: () => LineString,
    required: false,
    nullable: false,
  })
  trace: LineString;
}
