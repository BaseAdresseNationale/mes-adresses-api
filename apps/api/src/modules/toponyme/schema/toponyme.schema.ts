import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { Position, PositionSchema } from '@/lib/schemas/position.schema';
import { DateBase } from '@/lib/schemas/date.schema';

export type ToponymeDocument = HydratedDocument<Toponyme>;

@Schema({ collection: 'toponymes' })
export class Toponyme extends DateBase {
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

  @Prop([SchemaTypes.String])
  parcelles?: string[];

  @Prop({ type: [PositionSchema] })
  positions: Position[];
}

export const ToponymeSchema = SchemaFactory.createForClass(Toponyme);
