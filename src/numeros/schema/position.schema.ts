import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { HydratedDocument, Schema as SchemaMongoose } from 'mongoose';
import { Point, PointSchema } from './point.schema';


export type PositionDocument = HydratedDocument<Position>;

@Schema()
export class Position {

  @ApiProperty()
  @Prop({type: SchemaMongoose.Types.String})
  type: string;

  @ApiProperty()
  @Prop({type: SchemaMongoose.Types.String})
  source: string;

  @ApiProperty({ type: () => Point })
  @Prop({type: PointSchema})
  point: Point;

}

export const PositionSchema = SchemaFactory.createForClass(Position);