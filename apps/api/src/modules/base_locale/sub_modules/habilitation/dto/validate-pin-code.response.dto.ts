import { ApiProperty } from '@nestjs/swagger';

export class ValidatePinCodeResponseDTO {
  @ApiProperty({ required: true, nullable: false })
  validated: boolean;

  @ApiProperty({ required: false, nullable: true })
  message?: string;
}
