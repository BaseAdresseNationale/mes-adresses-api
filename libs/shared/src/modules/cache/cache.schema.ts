import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes } from 'mongoose';

export type BasesLocaleDocument = HydratedDocument<Cache>;

@Schema({ collection: '_mongo-cache' })
export class Cache {
  @Prop({ type: SchemaTypes.String })
  key: string;

  @Prop({ type: SchemaTypes.Mixed })
  value: any;
}

export const CacheSchema = SchemaFactory.createForClass(Cache);
