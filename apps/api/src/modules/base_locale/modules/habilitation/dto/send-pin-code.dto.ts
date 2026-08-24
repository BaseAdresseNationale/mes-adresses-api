import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class SendPinCodeDTO {
  @ApiProperty({ required: true, nullable: false })
  @IsEmail()
  email: string;
}
