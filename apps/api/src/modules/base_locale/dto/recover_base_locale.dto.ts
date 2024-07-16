import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsUUID } from 'class-validator';

export class RecoverBaseLocaleDTO {
  @IsUUID()
  @IsOptional()
  @ApiProperty({ required: false, nullable: true })
  id?: string;

  @ApiProperty({ required: true, nullable: false })
  @IsEmail()
  email: string;
}
