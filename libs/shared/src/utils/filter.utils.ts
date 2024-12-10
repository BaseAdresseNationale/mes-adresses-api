import { ExtendedVoieDTO } from '@/modules/voie/dto/extended_voie.dto';
import { Numero } from '../entities/numero.entity';
import { Voie } from '../entities/voie.entity';

export function filterComments<T extends Numero | Voie | ExtendedVoieDTO>(
  entity: T,
  filter: boolean = true,
): T {
  if (filter && entity.comment) {
    entity.comment = null;
  }
  if (filter && (entity as ExtendedVoieDTO).commentedNumeros) {
    (entity as ExtendedVoieDTO).commentedNumeros = null;
  }
  return entity;
}
