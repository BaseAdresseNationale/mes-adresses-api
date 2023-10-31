import { ApiProperty } from '@nestjs/swagger';
import { BBox as BboxTurf } from '@turf/helpers';

import { Voie } from '@/shared/schemas/voie/voie.schema';
import { Numero } from '@/shared/schemas/numero/numero.schema';

export class ExtendedVoie extends Voie {
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
