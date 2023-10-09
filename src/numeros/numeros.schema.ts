import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { Position, PositionSchema } from './position.schema';

export type NumeroDocument = HydratedDocument<Numeros>;

@Schema()
export class Numeros {

  @Prop({type: SchemaTypes.ObjectId})
  _id: Types.ObjectId;

  @Prop({type: SchemaTypes.ObjectId})
  _bal: Types.ObjectId;

  @Prop({type: SchemaTypes.Number})
  numero: number;

  @Prop({type: SchemaTypes.String})
  commune: string;

  @Prop({type: SchemaTypes.String})
  suffixe: string;

  @Prop({type: SchemaTypes.String})
  comment: string;

  @Prop({type: SchemaTypes.String})
  toponyme: string;

  @Prop({type: SchemaTypes.String})
  voie: string;

  @Prop([SchemaTypes.String])
  parcelles: string[];

  @Prop({type: SchemaTypes.Boolean})
  certifie: boolean;

  @Prop({type: [PositionSchema]})
  positions: Position[];

  @Prop({type: [SchemaTypes.String]})
  tiles: string[];

  @Prop({type: SchemaTypes.Date})
  _created: Date;

  @Prop({type: SchemaTypes.Date})
  _updated: Date;

  @Prop({type: SchemaTypes.Date})
  _delete: Date;
}

export const NumerosSchema = SchemaFactory.createForClass(Numeros);