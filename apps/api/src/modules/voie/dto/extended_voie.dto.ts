import { ApiProperty, IntersectionType } from '@nestjs/swagger';

import { Voie } from '@/shared/entities/voie.entity';

export class VoieMetas {
  @ApiProperty()
  id: string;

  @ApiProperty()
  nbNumeros?: number;

  @ApiProperty()
  nbNumerosCertifies?: number;

  @ApiProperty()
  isAllCertified?: boolean;

  @ApiProperty()
  comment?: string;

  @ApiProperty()
  commentedNumeros?: string[];
}

export class ExtendedVoieDTO extends IntersectionType(Voie, VoieMetas) {}
