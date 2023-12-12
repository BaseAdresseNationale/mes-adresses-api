import { ApiProperty } from '@nestjs/swagger';
import { Numero } from '../numero/numero.schema';
import { Voie } from './voie.schema';

export class PopulateVoie extends Voie {
  @ApiProperty({ type: () => Numero, isArray: true })
  numeros?: Numero[];
}
