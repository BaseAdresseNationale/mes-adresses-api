import { Toponyme } from '@/shared/schemas/toponyme/toponyme.schema';
import { PopulateVoie } from '@/shared/schemas/voie/voie.populate';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class AllDeletedInBalDTO {
  @Type(() => PopulateVoie)
  @ApiProperty({
    type: () => PopulateVoie,
    isArray: true,
  })
  voies: PopulateVoie[];

  @Type(() => Toponyme)
  @ApiProperty({
    type: () => Toponyme,
    isArray: true,
  })
  toponymes: Toponyme[];
}
