import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { HydratedDocument, SchemaTypes } from 'mongoose';
import { Validate, IsEnum } from 'class-validator';
import { PointValidator } from '../../validator/coord.validator';

export type PointDocument = HydratedDocument<Point>;

export enum PointTypeEnum {
  POINT = 'Point',
}

@Schema({
  _id: false,
})
export class Point {
  @IsEnum(PointTypeEnum)
  @ApiProperty()
  @Prop({
    type: SchemaTypes.String,
    enum: PointTypeEnum,
    required: true,
    nullable: false,
  })
  type: PointTypeEnum;

  @Validate(PointValidator)
  @ApiProperty()
  @Prop({ type: [SchemaTypes.Number], required: true, nullable: false })
  coordinates: [number, number];
}

export const PointSchema = SchemaFactory.createForClass(Point);
