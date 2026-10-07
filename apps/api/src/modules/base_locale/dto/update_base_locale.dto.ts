import {
  BaseLocale,
  BaseLocaleSetting,
} from '@/shared/entities/base_locale.entity';
import { ValidatorBal } from '@/shared/validators/validator_bal.validator';
import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsNotEmptyObject,
  IsOptional,
  Validate,
  ValidateIf,
} from 'class-validator';

export class UpdateBaseLocaleDTO implements Partial<BaseLocale> {
  @IsOptional()
  @ApiProperty({ required: false, nullable: false })
  @IsNotEmpty()
  nom?: string;

  @IsOptional()
  @IsNotEmptyObject()
  @Validate(ValidatorBal, ['lang_alt'])
  @ApiProperty({ required: false, nullable: true })
  communeNomsAlt?: Record<string, string>;

  @ValidateIf((_, value) => value !== undefined)
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(100)
  @IsEmail({}, { each: true })
  @ApiProperty({ required: false, nullable: false })
  emails?: Array<string>;

  @IsOptional()
  @ApiProperty({ required: false, nullable: true })
  settings?: BaseLocaleSetting;
}
