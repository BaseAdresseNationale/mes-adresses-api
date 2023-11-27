import { ApiProperty } from '@nestjs/swagger';

export class SendPinCodeResponseDTO {
  @ApiProperty({ required: true })
  code: number;

  @ApiProperty({ required: false })
  message: string;
}
