import { ApiProperty } from '@nestjs/swagger';

export class ValidatePinCodeResponseDTO {
  @ApiProperty({ required: true })
  validated: boolean;

  @ApiProperty({ required: true })
  message?: string;
}
