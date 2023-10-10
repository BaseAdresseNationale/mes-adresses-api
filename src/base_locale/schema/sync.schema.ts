import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { StatusSyncEnum } from './status.enum';

export type SyncDocument = HydratedDocument<Sync>;

@Schema()
export class Sync {

  @Prop({type: SchemaTypes.String})
  status: StatusSyncEnum

  @Prop({type: SchemaTypes.Boolean})
  isPaused: boolean;

  @Prop({type: SchemaTypes.ObjectId})
  lastUploadedRevisionId: Types.ObjectId;

}

export const SyncSchema = SchemaFactory.createForClass(Sync);