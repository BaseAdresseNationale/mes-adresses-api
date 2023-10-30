import { ApiProperty } from '@nestjs/swagger';
import { BBox as BboxTurf } from '@turf/helpers';
import { Toponyme } from '@/shared/schemas/toponyme/toponyme.schema';
import { Numero } from '@/shared/schemas/numero/numero.schema';

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
