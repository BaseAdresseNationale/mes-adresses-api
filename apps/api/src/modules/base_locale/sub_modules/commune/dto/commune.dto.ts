import { CommuneCOG } from '@/shared/types/cog.type';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CommuneCogDTO implements CommuneCOG {
  @ApiProperty()
  code: string;

  @ApiProperty()
  nom: string;

  @ApiProperty()
  typeLiaison: number;

  @ApiProperty()
  zone: string;

  @ApiProperty()
  arrondissement: string;

  @ApiProperty()
  departement: string;

  @ApiProperty()
  region: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  rangChefLieu: number;

  @ApiProperty()
  siren: string;

  @ApiProperty()
  codesPostaux: string[];

  @ApiProperty()
  population: number;
}

export class CommuneDTO extends CommuneCogDTO {
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

  @ApiProperty({ isArray: true })
  @Type(() => CommuneCogDTO)
  communesDeleguees: CommuneCogDTO;
}
