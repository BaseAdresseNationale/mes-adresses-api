import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { StatusSyncEnum } from './status.enum';
import { ApiProperty } from '@nestjs/swagger';

export type SyncDocument = HydratedDocument<Sync>;

@Schema({
  _id: false,
})
export class Sync {
  @ApiProperty({ enum: StatusSyncEnum })
  @Prop({ type: SchemaTypes.String, enum: StatusSyncEnum })
  status: StatusSyncEnum;

  @ApiProperty()
  @Prop({ type: SchemaTypes.Boolean })
  isPaused?: boolean;

  @ApiProperty({ type: String })
  @Prop({ type: SchemaTypes.ObjectId })
  lastUploadedRevisionId: Types.ObjectId;

  @ApiProperty()
  @Prop({ type: SchemaTypes.Date })
  currentUpdated?: Date;
}

export const SyncSchema = SchemaFactory.createForClass(Sync);
