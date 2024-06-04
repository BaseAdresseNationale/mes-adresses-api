import { ApiProperty } from '@nestjs/swagger';
import { Types } from 'mongoose';

export class BasesLocalesStatusDTO {
  @ApiProperty({ type: String })
  status: Types.ObjectId;

  @ApiProperty()
  count: number;
}
