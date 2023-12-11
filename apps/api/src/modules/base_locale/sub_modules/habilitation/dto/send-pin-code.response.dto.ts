import { ApiProperty } from '@nestjs/swagger';

export class SendPinCodeResponseDTO {
  @ApiProperty({ required: true, nullable: false })
  code: number;

  @ApiProperty({ required: true, nullable: false })
  message: string;
}
