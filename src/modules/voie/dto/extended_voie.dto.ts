import { ApiProperty } from '@nestjs/swagger';
import { BBox as BboxTurf } from '@turf/helpers';
import { Voie } from '../schema/voie.schema';
import { Numero } from '@/modules/numeros/schema/numero.schema';

export class ExtentedVoie extends Voie {
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
