import { Prop } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { SchemaTypes, Types } from 'mongoose';

export class BaseEntity {
  @ApiProperty({ type: String })
  @Prop({ type: SchemaTypes.ObjectId, auto: true })
  _id: Types.ObjectId;

  @ApiProperty()
  @Prop({ type: SchemaTypes.Date, default: Date.now })
  _created: Date;

  @ApiProperty()
  @Prop({ type: SchemaTypes.Date, default: Date.now })
  _updated: Date;

  @ApiProperty()
  @Prop({ type: SchemaTypes.Date, default: null })
  _deleted?: Date;
}
