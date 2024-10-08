import { ApiProperty } from '@nestjs/swagger';
import { BBox as BboxTurf } from '@turf/helpers';

import { Numero } from '@/shared/entities/numero.entity';
import { Voie } from '@/shared/entities/voie.entity';

export class ExtendedVoieDTO extends Voie {
  @ApiProperty()
  nbNumeros?: number;

  @ApiProperty()
  nbNumerosCertifies?: number;

  @ApiProperty()
  isAllCertified?: boolean;

  @ApiProperty()
  commentedNumeros?: Numero[];

  @ApiProperty()
  bbox?: BboxTurf;
}
