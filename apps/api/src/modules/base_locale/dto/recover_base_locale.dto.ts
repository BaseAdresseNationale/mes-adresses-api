import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsMongoId } from 'class-validator';

export class RecoverBaseLocaleDTO {
  @IsMongoId()
  @ApiProperty({ required: false, nullable: true })
  id?: string;

  @ApiProperty({ required: true, nullable: false })
  @IsEmail()
  email: string;
}
