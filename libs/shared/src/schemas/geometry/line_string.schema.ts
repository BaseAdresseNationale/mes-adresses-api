import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { HydratedDocument, SchemaTypes } from 'mongoose';
import { Equals, Validate } from 'class-validator';
import { LineStringValidator } from '../../validators/coord.validator';
import {
  LineString as LineStringTurf,
  Position as PositionTurf,
} from '@turf/helpers';

export type LineStringDocument = HydratedDocument<LineString>;

@Schema({
  _id: false,
})
export class LineString implements LineStringTurf {
  @Equals('LineString')
  @ApiProperty()
  @Prop({ type: SchemaTypes.String, required: true, nullable: false })
  type: 'LineString';

  @Validate(LineStringValidator)
  @ApiProperty()
  @Prop({ type: [[SchemaTypes.Number]], required: true, nullable: false })
  coordinates: PositionTurf[];
}

export const LineStringSchema = SchemaFactory.createForClass(LineString);
