import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { HydratedDocument, SchemaTypes } from 'mongoose';
import { Validate, IsEnum } from 'class-validator';
import { PointValidator } from '../../validator/coord.validator';

export type PointDocument = HydratedDocument<Point>;

export enum PointTypeEnum {
  POINT = 'Point',
}

@Schema()
export class Point {
  @IsEnum(PointTypeEnum)
  @ApiProperty()
  @Prop({ type: SchemaTypes.String, enum: PointTypeEnum })
  type: PointTypeEnum;

  @Validate(PointValidator)
  @ApiProperty()
  @Prop({ type: [SchemaTypes.Number] })
  coordinates: {
    type: [number];
    required: true;
  };
}

export const PointSchema = SchemaFactory.createForClass(Point);
