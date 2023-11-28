import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsMongoId, IsOptional } from 'class-validator';

export class RecoverBaseLocaleDTO {
  @IsMongoId()
  @IsOptional()
  @ApiProperty({ required: false, nullable: true })
  id?: string;

  @ApiProperty({ required: true, nullable: false })
  @IsEmail()
  email: string;
}
