import { ApiProperty } from '@nestjs/swagger';

export class CommunePrecedenteDTO {
  @ApiProperty()
  code: string;

  @ApiProperty()
  nom: string;
}

export class CommuneDTO {
  @ApiProperty()
  code: string;

  @ApiProperty()
  nom: string;

  @ApiProperty()
  isCOM: boolean;

  @ApiProperty()
  hasCadastre: boolean;

  @ApiProperty()
  hasOpenMapTiles: boolean;

  @ApiProperty()
  hasOrtho: boolean;

  @ApiProperty()
  hasPlanIGN: boolean;

  @ApiProperty({ type: () => CommunePrecedenteDTO, isArray: true })
  communesDeleguees: CommunePrecedenteDTO[];
}
