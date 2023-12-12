import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes } from 'mongoose';
import { Sync, SyncSchema } from './sync.schema';
import { StatusBaseLocalEnum } from './status.enum';
import { BaseEntity } from '../base-entity.schema';
import { ApiProperty } from '@nestjs/swagger';

export type BasesLocaleDocument = HydratedDocument<BaseLocale>;

@Schema({ collection: 'bases_locales' })
export class BaseLocale extends BaseEntity {
  @ApiProperty()
  @Prop({ type: SchemaTypes.String })
  nom: string;

  @ApiProperty()
  @Prop({ type: [SchemaTypes.String] })
  emails: string[];

  @ApiProperty()
  @Prop({ type: SchemaTypes.String })
  token: string;

  @ApiProperty({ enum: StatusBaseLocalEnum })
  @Prop({ type: SchemaTypes.String, enum: StatusBaseLocalEnum })
  status: StatusBaseLocalEnum;

  @ApiProperty()
  @Prop({ type: SchemaTypes.String })
  _habilitation: string;

  @ApiProperty()
  @Prop({ type: SchemaTypes.String })
  commune: string;

  @ApiProperty()
  @Prop({ type: SchemaTypes.Boolean })
  enableComplement: boolean;

  @ApiProperty()
  @Prop({ type: SyncSchema })
  sync: Sync;
}

export const BaseLocaleSchema = SchemaFactory.createForClass(BaseLocale);
