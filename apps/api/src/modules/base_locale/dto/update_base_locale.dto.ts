import { ValidatorBal } from '@/shared/validators/validator_bal.validator';
import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsEmail,
  IsNotEmpty,
  IsNotEmptyObject,
  IsOptional,
  Validate,
} from 'class-validator';

export class UpdateBaseLocaleDTO {
  @IsOptional()
  @ApiProperty({ required: false, nullable: false })
  @IsNotEmpty()
  nom?: string;

  @IsOptional()
  @IsNotEmptyObject()
  @Validate(ValidatorBal, ['lang_alt'])
  @ApiProperty({ required: false, nullable: true })
  communeNomsAlt: Record<string, string>;

  @IsOptional()
  @ApiProperty({ required: false, nullable: false })
  @ArrayNotEmpty()
  @ArrayMaxSize(100)
  @IsEmail({}, { each: true })
  emails?: Array<string>;
}
