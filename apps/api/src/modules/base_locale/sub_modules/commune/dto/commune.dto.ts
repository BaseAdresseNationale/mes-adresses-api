import { ApiProperty } from '@nestjs/swagger';

export class CommuneExtraDTO {
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
}
