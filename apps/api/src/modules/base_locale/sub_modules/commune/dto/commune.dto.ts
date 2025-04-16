import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CommuneAncienneDTO {
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

  @Type(() => CommuneAncienneDTO)
  @ApiProperty({
    type: () => CommuneAncienneDTO,
    isArray: true,
  })
  communesDeleguees: CommuneAncienneDTO[];
}
