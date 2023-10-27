import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { HydratedDocument, SchemaTypes } from 'mongoose';
import { Point, PointSchema } from '@/lib/schemas/geometry/point.schema';
import { ValidatorBal } from '@/lib/validators/validator_bal.validator';
import { ValidateNested, Validate, IsEnum, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { PositionTypeEnum } from './position_type.enum';

export type PositionDocument = HydratedDocument<Position>;

@Schema({
  _id: false,
})
export class Position {
  @IsEnum(PositionTypeEnum)
  @Validate(ValidatorBal, ['position'])
  @ApiProperty()
  @Prop({ type: SchemaTypes.String, enum: PositionTypeEnum })
  type: PositionTypeEnum;

  @IsOptional()
  @Validate(ValidatorBal, ['source'])
  @ApiProperty()
  @Prop({ type: SchemaTypes.String })
  source?: string;

  @ValidateNested()
  @Type(() => Point)
  @ApiProperty({ type: () => Point })
  @Prop({ type: PointSchema })
  point: Point;
}

export const PositionSchema = SchemaFactory.createForClass(Position);
