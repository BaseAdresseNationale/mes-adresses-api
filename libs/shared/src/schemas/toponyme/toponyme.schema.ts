import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { Position, PositionSchema } from '../position.schema';
import { BaseEntity } from '../base-entity.schema';
import { ApiProperty } from '@nestjs/swagger';

export type ToponymeDocument = HydratedDocument<Toponyme>;

@Schema({ collection: 'toponymes' })
export class Toponyme extends BaseEntity {
  @ApiProperty({ type: String })
  @Prop({ type: SchemaTypes.ObjectId })
  _bal: Types.ObjectId;

  @ApiProperty()
  @Prop({ type: SchemaTypes.String })
  nom: string;

  @ApiProperty()
  @Prop({ type: SchemaTypes.String })
  commune: string;

  @ApiProperty()
  @Prop({ type: Object })
  nomAlt: Record<string, string>;

  @ApiProperty()
  @Prop([SchemaTypes.String])
  parcelles?: string[];

  @ApiProperty({ type: () => Position, isArray: true })
  @Prop({ type: [PositionSchema] })
  positions: Position[];
}

export const ToponymeSchema = SchemaFactory.createForClass(Toponyme);
