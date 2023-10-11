import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { HydratedDocument, SchemaTypes } from 'mongoose';
import { IsEnum, Validate } from 'class-validator';
import { LineStringValidator } from '../../validator/coord.validator';

export type LineStringDocument = HydratedDocument<LineString>;

export enum LineStringTypeEnum {
  LINE_STRING = 'LineString',
}

@Schema({
  _id: false,
})
export class LineString {
  @IsEnum(LineStringTypeEnum)
  @ApiProperty()
  @Prop({ type: SchemaTypes.String, enum: LineStringTypeEnum })
  type: LineStringTypeEnum;

  @Validate(LineStringValidator)
  @ApiProperty()
  @Prop({ type: [SchemaTypes.Number] })
  coordinates: {
    type: [[number]];
    required: true;
  };
}

export const LineStringSchema = SchemaFactory.createForClass(LineString);
