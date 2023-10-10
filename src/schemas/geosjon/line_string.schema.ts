import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { HydratedDocument, SchemaTypes } from 'mongoose';
import { IsEnum, Validate } from 'class-validator'
import { LineStringValidator } from '../validator/coord.validator'

export type LineStringDocument = HydratedDocument<LineString>;

@Schema()
export class LineString {

  @IsEnum(['LineString'])
  @ApiProperty()
  @Prop({type: SchemaTypes.String})
  type: {
    type: String,
    enum: ['LineString'],
    required: true
  };

  @Validate(LineStringValidator)
  @ApiProperty()
  @Prop({type: [SchemaTypes.Number]})
  coordinates: {
    type: [[Number]],
    required: true
  };
}

export const LineStringSchema = SchemaFactory.createForClass(LineString);
