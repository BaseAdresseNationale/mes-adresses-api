import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { Position, PositionSchema } from '@/lib/schemas/position.schema';
import { DateBase } from '@/lib/schemas/date.schema';
import { displaySuffix } from '../numero.utils';
import { Voie } from '@/modules/voie/schema/voie.schema';

export class NumeroPopulate extends DateBase {
  @ApiProperty()
  _id: Types.ObjectId;

  @ApiProperty()
  _bal: Types.ObjectId;

  @ApiProperty()
  numero: number;

  @ApiProperty()
  commune: string;

  @ApiProperty()
  suffixe?: string;

  @ApiProperty()
  comment?: string;

  @ApiProperty()
  toponyme?: Types.ObjectId;

  @ApiProperty()
  voie: Voie;

  @ApiProperty()
  parcelles?: string[];

  @ApiProperty()
  certifie?: boolean;

  @ApiProperty({ type: () => Position, isArray: true })
  positions: Position[];

  @ApiProperty()
  tiles: string[];
}
