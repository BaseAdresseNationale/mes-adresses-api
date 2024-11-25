import { Numero } from '../entities/numero.entity';
import { Voie } from '../entities/voie.entity';

export function filterComments<T extends Numero | Voie>(
  entity: T,
  filter: boolean = true,
): T {
  if (filter && entity.comment) {
    entity.comment = null;
  }
  return entity;
}
