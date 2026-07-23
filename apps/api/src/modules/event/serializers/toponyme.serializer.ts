import { Toponyme } from '@/shared/entities/toponyme.entity';

// Excludes updatedAt and loaded relations (positions, numeros, baseLocale).
export function serializeToponyme(toponyme: Toponyme): Record<string, any> {
  return {
    id: toponyme.id,
    banId: toponyme.banId,
    createdAt: toponyme.createdAt,
    balId: toponyme.balId,
    nom: toponyme.nom,
    nomAlt: toponyme.nomAlt ?? null,
    communeDeleguee: toponyme.communeDeleguee ?? null,
    parcelles: toponyme.parcelles ?? null,
    codeVoie: toponyme.codeVoie ?? null,
  };
}
