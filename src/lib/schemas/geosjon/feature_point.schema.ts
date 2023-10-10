import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { SchemaTypes } from 'mongoose';
import { Point, PointSchema } from '../../schemas/geosjon/point.schema';
import { ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export enum FeatureTypeEnum {
  FEATURE = 'Feature',
}

@Schema()
export class FeaturePoint {
  @IsEnum(FeatureTypeEnum)
  @ApiProperty()
  @Prop({ type: SchemaTypes.String, enum: FeatureTypeEnum })
  type: FeatureTypeEnum;

  @ApiProperty()
  @Prop({ type: SchemaTypes.Map })
  properties: Record<string, unknown>;

  @ValidateNested()
  @Type(() => Point)
  @ApiProperty({ type: () => Point })
  @Prop({ type: PointSchema })
  point: Point;
}

export const FeaturePointSchema = SchemaFactory.createForClass(FeaturePoint);
