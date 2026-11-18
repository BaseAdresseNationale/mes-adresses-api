import { Toponyme } from '@/shared/entities/toponyme.entity';
import { SerializedToponyme } from '@/shared/entities/event_payload.type';

// Excludes updatedAt and loaded relations (positions, numeros, baseLocale).
// `numeroIds` defaults to `[]` so call sites that can't yet supply the real
// membership (e.g. composite events, not covered by this junction rework)
// keep compiling unchanged.
export function serializeToponyme(
  toponyme: Toponyme,
  numeroIds: string[] = [],
): SerializedToponyme {
  return {
    id: toponyme.id,
    banId: toponyme.banId,
    createdAt: toponyme.createdAt.toISOString(),
    balId: toponyme.balId,
    nom: toponyme.nom,
    nomAlt: toponyme.nomAlt ?? null,
    communeDeleguee: toponyme.communeDeleguee ?? null,
    parcelles: toponyme.parcelles ?? null,
    codeVoie: toponyme.codeVoie ?? null,
    numeroIds,
  };
}
