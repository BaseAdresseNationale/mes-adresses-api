import { Toponyme } from '@/shared/entities/toponyme.entity';
import { Voie } from '@/shared/entities/voie.entity';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class AllDeletedInBalDTO {
  @Type(() => Voie)
  @ApiProperty({
    type: () => Voie,
    isArray: true,
  })
  voies: Voie[];

  @Type(() => Toponyme)
  @ApiProperty({
    type: () => Toponyme,
    isArray: true,
  })
  toponymes: Toponyme[];
}
