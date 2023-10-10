import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { Position, PositionSchema } from './position.schema';

export type NumeroDocument = HydratedDocument<Numero>;

// MODEL

@Schema({
  collection: 'numeros',
  toJSON: {
    virtuals: true,
  },
})
export class Numero {

  @ApiProperty()
  @Prop({type: SchemaTypes.ObjectId})
  _id: Types.ObjectId;

  @ApiProperty()
  @Prop({type: SchemaTypes.ObjectId})
  _bal: Types.ObjectId;

  @ApiProperty()
  @Prop({type: SchemaTypes.Number})
  numero: number;

  @ApiProperty()
  @Prop({type: SchemaTypes.String})
  commune: string;

  @ApiProperty()
  @Prop({type: SchemaTypes.String})
  suffixe?: string;

  @ApiProperty()
  @Prop({type: SchemaTypes.String})
  comment?: string;

  @ApiProperty()
  @Prop({type: SchemaTypes.String})
  toponyme?: string;

  @ApiProperty()
  @Prop({type: SchemaTypes.String})
  voie: string;

  @ApiProperty()
  @Prop([SchemaTypes.String])
  parcelles?: string[];

  @ApiProperty()
  @Prop({type: SchemaTypes.Boolean})
  certifie?: boolean;

  @ApiProperty({ type: () => Position, isArray: true })
  @Prop({type: [PositionSchema]})
  positions: Position[];

  @ApiProperty()
  @Prop({type: [SchemaTypes.String]})
  tiles: string[];

  @ApiProperty()
  @Prop({type: SchemaTypes.Date})
  _created: Date;

  @ApiProperty()
  @Prop({type: SchemaTypes.Date})
  _updated: Date;

  @ApiProperty()
  @Prop({type: SchemaTypes.Date})
  _delete?: Date;

  static filterSensitiveFields(numero: Numero): Numero {
    numero.comment = null
    return numero
  }
}

// SCHEMA

export const NumeroSchema = SchemaFactory.createForClass(Numero)

function displaySuffix(suffix) {
  if (suffix) {
    return suffix.trim().match(/^\d/) ? (
      '-' + suffix.trim()
    ) : (
      suffix.trim()
    )
  }

  return ''
}


NumeroSchema.virtual('numeroComplet').get(function () {
  return this.numero + displaySuffix(this.suffixe)
})
