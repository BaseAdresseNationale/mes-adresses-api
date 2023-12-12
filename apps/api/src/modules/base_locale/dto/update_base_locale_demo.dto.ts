import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class UpdateBaseLocaleDemoDTO {
  @ApiProperty({ required: true, nullable: false })
  @IsNotEmpty()
  nom: string;

  @ApiProperty({ required: true, nullable: false })
  @IsEmail()
  email: string;
}
