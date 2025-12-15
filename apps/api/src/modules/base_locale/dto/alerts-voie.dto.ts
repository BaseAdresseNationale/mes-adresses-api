import { ApiProperty } from '@nestjs/swagger';
import {
  AlertVoie,
  AlertModelEnum,
  AlertCodeVoieEnum,
  AlertFieldVoieEnum,
} from '../../../lib/types/alerts.type';

export class AlertVoieDTO implements AlertVoie {
  @ApiProperty({ enum: AlertModelEnum, example: AlertModelEnum.VOIE })
  model: AlertModelEnum.VOIE;

  @ApiProperty({
    type: [String],
    enum: AlertCodeVoieEnum,
    example: [AlertCodeVoieEnum.CARACTERE_INVALIDE],
  })
  codes: AlertCodeVoieEnum[];

  @ApiProperty({
    enum: AlertFieldVoieEnum,
    example: AlertFieldVoieEnum.VOIE_NOM,
  })
  field: AlertFieldVoieEnum;

  @ApiProperty({ type: String, example: 'Rue de la Paix' })
  value: string;

  @ApiProperty({
    type: String,
    required: false,
    example: 'Correction suggérée',
  })
  remediation?: string;
}
