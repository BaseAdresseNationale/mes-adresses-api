import { Voie } from '@/shared/entities/voie.entity';
import { SerializedVoie } from '@/shared/entities/event_payload.type';

// Excludes updatedAt and loaded relations (numeros, baseLocale).
export function serializeVoie(voie: Voie): SerializedVoie {
  return {
    id: voie.id,
    banId: voie.banId,
    createdAt: voie.createdAt.toISOString(),
    balId: voie.balId,
    nom: voie.nom,
    nomAlt: voie.nomAlt ?? null,
    typeNumerotation: voie.typeNumerotation,
    centroid: voie.centroid ?? null,
    trace: voie.trace ?? null,
    bbox: voie.bbox ?? null,
    codeVoie: voie.codeVoie ?? null,
    comment: voie.comment ?? null,
  };
}
