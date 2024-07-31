import { ApiProperty } from '@nestjs/swagger';

export class BasesLocalesStatusDTO {
  @ApiProperty({ type: String })
  status: string;

  @ApiProperty()
  count: number;
}
