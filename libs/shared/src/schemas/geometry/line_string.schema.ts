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
  @ApiProperty({
    enum: ['LineString'],
    type: String,
  })
  @Prop({ type: SchemaTypes.String, required: true, nullable: false })
  type: 'LineString';

  @Validate(LineStringValidator)
  @ApiProperty({
    type: 'array',
    items: {
      type: 'array',
      items: {
        type: 'number',
      },
    },
  })
  @Prop({ type: [[SchemaTypes.Number]], required: true, nullable: false })
  coordinates: PositionTurf[];
}

export const LineStringSchema = SchemaFactory.createForClass(LineString);
