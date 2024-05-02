import { ApiProperty } from '@nestjs/swagger';

export class ValidatePinCodeResponseDTO {
  @ApiProperty({ required: true, nullable: false })
  validated: boolean;

  @ApiProperty({ required: false, nullable: true })
  error?: string;

  @ApiProperty({ required: false, nullable: true })
  remainingAttempts?: number;
}
