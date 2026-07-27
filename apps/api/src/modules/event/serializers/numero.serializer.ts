import { Numero } from '@/shared/entities/numero.entity';
import { SerializedNumero } from '@/shared/entities/event_payload.type';

// Excludes updatedAt (noise, changes on every write) and loaded relations
// (positions, voie, toponyme, baseLocale) — positions are diffed and
// serialized as their own events, relations are irrelevant to the payload.
export function serializeNumero(numero: Numero): SerializedNumero {
  return {
    id: numero.id,
    banId: numero.banId,
    createdAt: numero.createdAt.toISOString(),
    balId: numero.balId,
    voieId: numero.voieId,
    numero: numero.numero,
    suffixe: numero.suffixe ?? null,
    comment: numero.comment ?? null,
    parcelles: numero.parcelles ?? null,
    certifie: numero.certifie ?? false,
    communeDeleguee: numero.communeDeleguee ?? null,
  };
}
