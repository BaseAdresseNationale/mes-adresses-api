import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsEmail, IsOptional } from 'class-validator';

export class UpdateBaseLocaleDemoDTO {
  @IsOptional()
  @ApiProperty({ required: true, nullable: false })
  nom?: string;

  @IsOptional()
  @ApiProperty({ required: true, nullable: false })
  @ArrayNotEmpty()
  @IsEmail({}, { each: true })
  emails?: Array<string>;
}
