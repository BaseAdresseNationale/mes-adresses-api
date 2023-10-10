import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { HydratedDocument, SchemaTypes } from 'mongoose';
import { Point, PointSchema } from './point.schema';
import { ValidatorBal } from '../../validator/validator_bal.validator'
import { ValidateNested, Validate } from 'class-validator'
import { Type } from 'class-transformer';

export type PositionDocument = HydratedDocument<Position>;

@Schema()
export class Position {

  @Validate(ValidatorBal, [ 'position' ])
  @ApiProperty()
  @Prop({type: SchemaTypes.String})
  type: string;

  @Validate(ValidatorBal, [ 'source' ])
  @ApiProperty()
  @Prop({type: SchemaTypes.String})
  source: string;

  @ValidateNested()
  @Type(() => Point)
  @ApiProperty({ type: () => Point })
  @Prop({type: PointSchema})
  point: Point;

}

export const PositionSchema = SchemaFactory.createForClass(Position);