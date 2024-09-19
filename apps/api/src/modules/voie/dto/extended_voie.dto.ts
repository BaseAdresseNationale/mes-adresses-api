import { ApiProperty } from '@nestjs/swagger';

import { Voie } from '@/shared/entities/voie.entity';

export class ExtendedVoieDTO extends Voie {
  @ApiProperty()
  nbNumeros?: number;

  @ApiProperty()
  nbNumerosCertifies?: number;

  @ApiProperty()
  isAllCertified?: boolean;

  @ApiProperty()
  comments?: string[];

  @ApiProperty({ type: Number, isArray: true })
  bbox?: number[];
}
