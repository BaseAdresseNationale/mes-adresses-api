import { StatusBaseLocalEnum } from '@/shared/entities/base_locale.entity';
import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
} from 'class-validator';

export class UpdateBaseLocaleDTO {
  @IsOptional()
  @ApiProperty({ required: false, nullable: false })
  @IsNotEmpty()
  nom?: string;

  @IsOptional()
  @ApiProperty({ required: false, nullable: false, enum: StatusBaseLocalEnum })
  @IsEnum(StatusBaseLocalEnum)
  status?: StatusBaseLocalEnum;

  @IsOptional()
  @ApiProperty({ required: false, nullable: false })
  @ArrayNotEmpty()
  @ArrayMaxSize(100)
  @IsEmail({}, { each: true })
  emails?: Array<string>;
}
