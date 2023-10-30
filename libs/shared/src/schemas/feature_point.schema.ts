import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { SchemaTypes } from 'mongoose';
import { Point, PointSchema } from './geometry/point.schema';
import { ValidateNested, Equals, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { Point as PointTurf, Feature as FeatureTurf } from '@turf/helpers';

@Schema({
  _id: false,
})
export class FeaturePoint implements FeatureTurf<PointTurf> {
  @Equals('Feature')
  @ApiProperty()
  @Prop({ type: SchemaTypes.String, required: true })
  type: 'Feature';

  @IsOptional()
  @ApiProperty()
  @Prop({ type: SchemaTypes.Map })
  properties: Record<string, unknown>;

  @ValidateNested()
  @Type(() => Point)
  @ApiProperty({ type: () => Point })
  @Prop({ type: PointSchema })
  geometry: Point;
}

export const FeaturePointSchema = SchemaFactory.createForClass(FeaturePoint);
