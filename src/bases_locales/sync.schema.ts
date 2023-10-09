import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as SchemaMongoose } from 'mongoose';

export type SyncDocument = HydratedDocument<Sync>;

@Schema()
export class Sync {

  @Prop({type: SchemaMongoose.Types.String})
  status: {
    type: String,
    enum: ['outdated', 'synced', 'conflict'],
  }

  @Prop({type: SchemaMongoose.Types.Boolean})
  isPaused: boolean;

  @Prop({type: SchemaMongoose.Types.String})
  lastUploadedRevisionId: string;

}

export const SyncSchema = SchemaFactory.createForClass(Sync);