import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { HydratedDocument, Schema as SchemaMongoose } from 'mongoose';

export type PointDocument = HydratedDocument<Point>;

@Schema()
export class Point {

  @ApiProperty()
  @Prop({type: SchemaMongoose.Types.String})
  type: {
    type: String,
    enum: ['Point'],
    required: true
  };

  @ApiProperty()
  @Prop({type: [SchemaMongoose.Types.Number]})
  coordinates: {
    type: [Number],
    required: true
  };
}

export const PointSchema = SchemaFactory.createForClass(Point);
