import { Prop } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { SchemaTypes } from 'mongoose';

export class DateBase {
  @ApiProperty()
  @Prop({ type: SchemaTypes.Date })
  _created: Date;

  @ApiProperty()
  @Prop({ type: SchemaTypes.Date })
  _updated: Date;

  @ApiProperty()
  @Prop({ type: SchemaTypes.Date })
  _delete?: Date;
}
