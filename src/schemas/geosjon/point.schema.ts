import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { HydratedDocument, SchemaTypes } from 'mongoose';
import { Validate, IsEnum } from 'class-validator'
import { PointValidator } from '../validator/coord.validator'

export type PointDocument = HydratedDocument<Point>;

@Schema()
export class Point {

  @IsEnum(['Point'])
  @ApiProperty()
  @Prop({type: SchemaTypes.String})
  type: {
    type: String,
    enum: ['Point'],
    required: true
  };

  @Validate(PointValidator)
  @ApiProperty()
  @Prop({type: [SchemaTypes.Number]})
  coordinates: {
    type: [Number],
    required: true
  };
}

export const PointSchema = SchemaFactory.createForClass(Point);
