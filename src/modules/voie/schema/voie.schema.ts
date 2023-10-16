import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import {
  FeaturePoint,
  FeaturePointSchema,
} from '@/lib/schemas/feature_point.schema';
import {
  LineString,
  LineStringSchema,
} from '@/lib/schemas/geosjon/line_string.schema';
import { TypeNumerotationEnum } from './type_numerotation.enum';
import { DateBase } from '@/lib/schemas/date.schema';

export type VoieDocument = HydratedDocument<Voie>;

@Schema({ collection: 'voies' })
export class Voie extends DateBase {
  @Prop({ type: SchemaTypes.ObjectId })
  _id: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId })
  _bal: Types.ObjectId;

  @Prop({ type: SchemaTypes.String })
  nom: string;

  @Prop({ type: SchemaTypes.String })
  commune: string;

  @Prop({ type: [SchemaTypes.Map] })
  nomAlt: Record<string, string>;

  @Prop({ type: FeaturePointSchema })
  centroid: FeaturePoint;

  @Prop({ type: [SchemaTypes.String] })
  centroidTiles: string[];

  @Prop({ type: SchemaTypes.String, enum: TypeNumerotationEnum })
  typeNumerotation: TypeNumerotationEnum;

  @Prop({ type: LineStringSchema })
  trace: LineString;

  @Prop({ type: [SchemaTypes.String] })
  traceTiles: string[];
}

// code: string;
// positions: [],
// complement: null,

export const VoieSchema = SchemaFactory.createForClass(Voie);
