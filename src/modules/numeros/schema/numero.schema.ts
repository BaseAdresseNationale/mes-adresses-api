import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { HydratedDocument, SchemaTypes, Types, Document } from 'mongoose';
import { Position, PositionSchema } from './position.schema';

export type NumeroDocument = HydratedDocument<Numero>;

@Schema({
  collection: 'numeros',
  toJSON: {
    virtuals: true,
  },
})
export class Numero extends Document {
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
  @Prop({ type: SchemaTypes.String })
  toponyme?: string;

  @ApiProperty()
  @Prop({ type: SchemaTypes.String })
  voie: string;

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

  @ApiProperty()
  @Prop({ type: SchemaTypes.Date })
  _created: Date;

  @ApiProperty()
  @Prop({ type: SchemaTypes.Date })
  _updated: Date;

  @ApiProperty()
  @Prop({ type: SchemaTypes.Date })
  _delete?: Date;

  filterSensitiveFields: (filter: boolean) => Numero;

  displaySuffix: () => string;
}

export const NumeroSchema = SchemaFactory.createForClass(Numero);

// METHODS

NumeroSchema.methods.displaySuffix = function () {
  if (this.suffixe) {
    if (this.suffixe.trim().match(/^\d/)) {
      return '-' + this.suffixe.trim();
    }
    return this.suffixe.trim();
  }

  return '';
};

NumeroSchema.methods.filterSensitiveFields = function (filter: boolean = true) {
  if (filter) {
    this.comment = null;
  }
  return this;
};

// VIRTUALS

NumeroSchema.virtual('numeroComplet').get(function () {
  return this.numero + this.displaySuffix();
});

// INDEXES

NumeroSchema.index({ _bal: 1 });
NumeroSchema.index({ _bal: 1, commune: 1 });
NumeroSchema.index({ voie: 1 });
NumeroSchema.index({ toponyme: 1 });
NumeroSchema.index({ _deleted: 1 });
NumeroSchema.index({ tiles: 1 });
