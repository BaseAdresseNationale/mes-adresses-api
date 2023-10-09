import { ApiProperty } from '@nestjs/swagger';
import { Position } from '../schema/position.schema';

export class UpdateNumeroDto {

  @ApiProperty()
  numero: number;

  @ApiProperty()
  suffixe: string;

  @ApiProperty()
  comment: string;

  @ApiProperty()
  toponyme: string;

  @ApiProperty()
  voie: string;

  @ApiProperty()
  parcelles: string[];

  @ApiProperty()
  certifie: boolean;

  @ApiProperty({ type: () => Position, isArray: true })
  positions: Position[];

}