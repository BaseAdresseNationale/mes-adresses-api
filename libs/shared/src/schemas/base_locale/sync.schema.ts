import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { StatusSyncEnum } from './status.enum';

export type SyncDocument = HydratedDocument<Sync>;

@Schema({
  _id: false,
})
export class Sync {
  @Prop({ type: SchemaTypes.String, enum: StatusSyncEnum })
  status: StatusSyncEnum;

  @Prop({ type: SchemaTypes.Boolean })
  isPaused: boolean;

  @Prop({ type: SchemaTypes.ObjectId })
  lastUploadedRevisionId: Types.ObjectId;
}

export const SyncSchema = SchemaFactory.createForClass(Sync);
