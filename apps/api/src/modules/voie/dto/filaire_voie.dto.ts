import { ApiProperty } from '@nestjs/swagger';

import { Voie } from '@/shared/entities/voie.entity';

export class FilaireVoieDTO extends Voie {
  @ApiProperty()
  commune: string;
}
