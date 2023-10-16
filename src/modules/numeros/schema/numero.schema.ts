import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { Position, PositionSchema } from '@/lib/schemas/position.schema';
import { DateBase } from '@/lib/schemas/date.schema';
import { displaySuffix } from '../numero.utils';

export type NumeroDocument = HydratedDocument<Numero>;

@Schema({
  collection: 'numeros',
  toJSON: {
    virtuals: true,
  },
})
export class Numero extends DateBase {
  @ApiProperty()
  @Prop({ type: SchemaTypes.ObjectId })
  _id: Types.ObjectId;

  @ApiProperty()
  @Prop({ type: SchemaTypes.ObjectId })
  _bal: Types.ObjectId;

  @ApiProperty()
  @Prop({ type: SchemaTypes.Number })
  numero: number;

  @ApiProperty()
  @Prop({ type: SchemaTypes.String })
  commune: string;

  @ApiProperty()
  @Prop({ type: SchemaTypes.String })
  suffixe?: string;

  @ApiProperty()
  @Prop({ type: SchemaTypes.String })
  comment?: string;

  @ApiProperty()
  @Prop({ type: SchemaTypes.ObjectId })
  toponyme?: Types.ObjectId;

  @ApiProperty()
  @Prop({ type: SchemaTypes.ObjectId })
  voie: Types.ObjectId;

  @ApiProperty()
  @Prop([SchemaTypes.String])
  parcelles?: string[];

  @ApiProperty()
  @Prop({ type: SchemaTypes.Boolean })
  certifie?: boolean;

  @ApiProperty({ type: () => Position, isArray: true })
  @Prop({ type: [PositionSchema] })
  positions: Position[];

  @ApiProperty()
  @Prop({ type: [SchemaTypes.String] })
  tiles: string[];
}

export const NumeroSchema = SchemaFactory.createForClass(Numero);

// VIRTUALS

NumeroSchema.virtual('numeroComplet').get(function () {
  return this.numero + displaySuffix(this);
});

// INDEXES

NumeroSchema.index({ _bal: 1 });
NumeroSchema.index({ _bal: 1, commune: 1 });
NumeroSchema.index({ voie: 1 });
NumeroSchema.index({ toponyme: 1 });
NumeroSchema.index({ _deleted: 1 });
NumeroSchema.index({ tiles: 1 });
