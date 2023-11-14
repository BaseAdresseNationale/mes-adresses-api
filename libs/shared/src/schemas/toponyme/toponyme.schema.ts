import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { Position, PositionSchema } from '../position.schema';
import { BaseEntity } from '../base-entity.schema';

export type ToponymeDocument = HydratedDocument<Toponyme>;

@Schema({ collection: 'toponymes' })
export class Toponyme extends BaseEntity {
  @Prop({ type: SchemaTypes.ObjectId })
  _bal: Types.ObjectId;

  @Prop({ type: SchemaTypes.String })
  nom: string;

  @Prop({ type: SchemaTypes.String })
  commune: string;

  @Prop({ type: SchemaTypes.Map })
  nomAlt: Record<string, string>;

  @Prop([SchemaTypes.String])
  parcelles?: string[];

  @Prop({ type: [PositionSchema] })
  positions: Position[];
}

export const ToponymeSchema = SchemaFactory.createForClass(Toponyme);
