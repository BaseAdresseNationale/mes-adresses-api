import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { FeaturePoint, FeaturePointSchema } from '../../schemas/geosjon/feature_point.schema'
import { LineString, LineStringSchema } from '../../schemas/geosjon/line_string.schema'

export type VoieDocument = HydratedDocument<Voie>;

@Schema({ collection: 'voies'})
export class Voie {

  @Prop({type: SchemaTypes.ObjectId})
  _id: Types.ObjectId;

  @Prop({type: SchemaTypes.ObjectId})
  _bal: Types.ObjectId;

  @Prop({type: SchemaTypes.String})
  nom: string;

  @Prop({type: SchemaTypes.String})
  commune: string;

  @Prop({type: [SchemaTypes.Map]})
  nomAlt: Object;

  @Prop({type: FeaturePointSchema})
  centroid: FeaturePoint;

  @Prop({type: [SchemaTypes.String]})
  centroidTiles: string[];

  @Prop({type: SchemaTypes.String})
  typeNumerotation: {
    type: String,
    enum: ['numerique'],
  };

  @Prop({type: LineStringSchema})
  trace: LineString;

  @Prop({type: [SchemaTypes.String]})
  traceTiles: string[];

  @Prop({type: SchemaTypes.Date})
  _created: Date;

  @Prop({type: SchemaTypes.Date})
  _updated: Date;

  @Prop({type: SchemaTypes.Date})
  _delete: Date;
}

// code: string;
// positions: [],
// complement: null,

export const VoieSchema = SchemaFactory.createForClass(Voie);