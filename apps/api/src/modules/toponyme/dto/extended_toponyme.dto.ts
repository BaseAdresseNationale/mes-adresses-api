import { ApiProperty } from '@nestjs/swagger';
import { BBox as BboxTurf } from '@turf/helpers';
import { Toponyme } from '../schema/toponyme.schema';
import { Numero } from '@/modules/numeros/schema/numero.schema';

export class ExtentedToponyme extends Toponyme {
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
