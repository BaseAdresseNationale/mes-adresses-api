import { BaseLocale } from '@/shared/entities/base_locale.entity';

// La version des tuiles est le updatedAt de la BAL :
// toute écriture sur une donnée affichée dans les tuiles doit "touch" la BAL
export function getTilesEtag(baseLocale: BaseLocale): string {
  return `W/"${baseLocale.id}-${new Date(baseLocale.updatedAt).getTime()}"`;
}
