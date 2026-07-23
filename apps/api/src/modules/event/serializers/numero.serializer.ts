import { Numero } from '@/shared/entities/numero.entity';

// Excludes updatedAt (noise, changes on every write) and loaded relations
// (positions, voie, toponyme, baseLocale) — positions are diffed and
// serialized as their own events, relations are irrelevant to the payload.
export function serializeNumero(numero: Numero): Record<string, any> {
  return {
    id: numero.id,
    banId: numero.banId,
    createdAt: numero.createdAt,
    balId: numero.balId,
    voieId: numero.voieId,
    toponymeId: numero.toponymeId ?? null,
    numero: numero.numero,
    suffixe: numero.suffixe ?? null,
    comment: numero.comment ?? null,
    parcelles: numero.parcelles ?? null,
    certifie: numero.certifie ?? false,
    communeDeleguee: numero.communeDeleguee ?? null,
  };
}
