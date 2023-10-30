import { ApiProperty } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { Voie } from '@/shared/schemas/voie/voie.schema';
import { Position } from '@/lib/schemas/position.schema';
import { DateBase } from '@/lib/schemas/date.schema';

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
