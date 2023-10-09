import { ApiProperty } from '@nestjs/swagger';

export class Point {

  @ApiProperty()
  type: string;

  @ApiProperty()
  coordinates: [number, number];
}

export class Position {

  @ApiProperty()
  type: string;

  @ApiProperty()
  source: string;

  @ApiProperty({ type: () => Point })
  point: Point;

}

export class NumeroDto {

  @ApiProperty()
  _id: string;

  @ApiProperty()
  _bal: string;

  @ApiProperty()
  numero: number;

  @ApiProperty()
  commune: string;

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

  @ApiProperty()
  tiles: string[];

  @ApiProperty()
  _created: Date;

  @ApiProperty()
  _updated: Date;

  @ApiProperty()
  _delete: Date;
  
}