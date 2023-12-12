import { ApiProperty } from '@nestjs/swagger';
import { IsNumberString } from 'class-validator';

export class ValidatePinCodeDTO {
  @ApiProperty({ required: true, nullable: false })
  @IsNumberString()
  code: number;
}
