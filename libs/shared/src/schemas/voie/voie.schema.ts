import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { FeaturePoint, FeaturePointSchema } from '../feature_point.schema';
import { LineString, LineStringSchema } from '../geometry/line_string.schema';
import { TypeNumerotationEnum } from './type_numerotation.enum';
import { DateBase } from '../date.schema';

export type VoieDocument = HydratedDocument<Voie>;

@Schema({ collection: 'voies' })
export class Voie extends DateBase {
  @ApiProperty()
  @Prop({ type: SchemaTypes.ObjectId })
  _id: Types.ObjectId;

  @ApiProperty()
  @Prop({ type: SchemaTypes.ObjectId })
  _bal: Types.ObjectId;

  @ApiProperty()
  @Prop({ type: SchemaTypes.String })
  nom: string;

  @ApiProperty()
  @Prop({ type: SchemaTypes.String })
  commune: string;

  @ApiProperty()
  @Prop({ type: [SchemaTypes.Map] })
  nomAlt: Record<string, string>;

  @ApiProperty()
  @Prop({ type: FeaturePointSchema })
  centroid: FeaturePoint;

  @ApiProperty()
  @Prop({ type: [SchemaTypes.String] })
  centroidTiles: string[];

  @ApiProperty()
  @Prop({ type: SchemaTypes.String, enum: TypeNumerotationEnum })
  typeNumerotation: TypeNumerotationEnum;

  @ApiProperty()
  @Prop({ type: LineStringSchema })
  trace: LineString;

  @ApiProperty()
  @Prop({ type: [SchemaTypes.String] })
  traceTiles: string[];
}

export const VoieSchema = SchemaFactory.createForClass(Voie);
