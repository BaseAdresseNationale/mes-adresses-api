import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as SchemaMongoose } from 'mongoose';

export type PointDocument = HydratedDocument<Point>;

@Schema()
export class Point {

  @Prop({type: SchemaMongoose.Types.String})
  type: {
    type: String,
    enum: ['Point'],
    required: true
  };

  @Prop({type: [SchemaMongoose.Types.Number]})
  coordinates: {
    type: [Number],
    required: true
  };
}

export const PointSchema = SchemaFactory.createForClass(Point);

export type PositionDocument = HydratedDocument<Position>;

@Schema()
export class Position {

  @Prop({type: SchemaMongoose.Types.String})
  type: string;

  @Prop({type: SchemaMongoose.Types.String})
  source: string;

  @Prop({type: PointSchema})
  point: Point;

}

export const PositionSchema = SchemaFactory.createForClass(Position);