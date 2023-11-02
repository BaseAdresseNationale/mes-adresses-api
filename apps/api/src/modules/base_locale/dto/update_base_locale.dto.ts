import { StatusBaseLocalEnum } from '@/shared/schemas/base_locale/status.enum';
import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsEmail, IsEnum, IsOptional } from 'class-validator';

export class UpdateBaseLocaleDTO {
  @IsOptional()
  @ApiProperty({ required: true, nullable: false })
  nom?: string;

  @IsOptional()
  @IsEnum(StatusBaseLocalEnum)
  status?: StatusBaseLocalEnum;

  @IsOptional()
  @ApiProperty({ required: true, nullable: false })
  @ArrayNotEmpty()
  @IsEmail({}, { each: true })
  emails?: Array<string>;
}
