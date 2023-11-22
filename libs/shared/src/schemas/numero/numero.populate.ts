import { ApiProperty } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { Voie } from '@/shared/schemas/voie/voie.schema';
import { Position } from '../position.schema';
import { BaseEntity } from '../base-entity.schema';

export class NumeroPopulate extends BaseEntity {
  @ApiProperty({ type: String })
  _bal: Types.ObjectId;

  @ApiProperty()
  numero: number;

  @ApiProperty()
  commune: string;

  @ApiProperty()
  suffixe?: string;

  @ApiProperty()
  comment?: string;

  @ApiProperty({ type: String })
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
