import { ApiProperty } from '@nestjs/swagger';
import { Types } from 'mongoose';

export class BasesLocalesStatusDto {
  @ApiProperty()
  status: Types.ObjectId;

  @ApiProperty()
  count: number;
}
