import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { Sync, SyncSchema } from './sync.schema';
import { StatusBaseLocalEnum } from './status.enum';
import { DateBase } from '../date.schema';

export type BasesLocaleDocument = HydratedDocument<BaseLocale>;

@Schema({ collection: 'bases_locales' })
export class BaseLocale extends DateBase {
  @Prop({ type: SchemaTypes.ObjectId })
  _id: Types.ObjectId;

  @Prop({ type: SchemaTypes.Number })
  nom: number;

  @Prop({ type: [SchemaTypes.String] })
  emails: string[];

  @Prop({ type: SchemaTypes.String })
  token: string;

  @Prop({ type: SchemaTypes.String, enum: StatusBaseLocalEnum })
  status: StatusBaseLocalEnum;

  @Prop({ type: SchemaTypes.String })
  _habilitation: string;

  @Prop({ type: SchemaTypes.String })
  commune: string;

  @Prop({ type: SchemaTypes.Boolean })
  enableComplement: boolean;

  @Prop({ type: SyncSchema })
  sync: Sync;
}

export const BaseLocaleSchema = SchemaFactory.createForClass(BaseLocale);
