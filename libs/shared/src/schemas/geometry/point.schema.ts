import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { HydratedDocument, SchemaTypes } from 'mongoose';
import { Validate, Equals } from 'class-validator';
import { PointValidator } from '../../validators/coord.validator';
import { Point as PointTurf, Position as PositionTurf } from '@turf/helpers';

export type PointDocument = HydratedDocument<Point>;

@Schema({
  _id: false,
})
export class Point implements PointTurf {
  @Equals('Point')
  @ApiProperty({ required: true, nullable: false })
  @Prop({
    type: SchemaTypes.String,
    required: true,
    nullable: false,
  })
  type: 'Point';

  @Validate(PointValidator)
  @ApiProperty({ required: true, nullable: false })
  @Prop({ type: [SchemaTypes.Number], required: true, nullable: false })
  coordinates: PositionTurf;
}

export const PointSchema = SchemaFactory.createForClass(Point);
