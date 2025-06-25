import { keyBy, flatten } from 'lodash';
import * as allCommunes from '@etalab/decoupage-administratif/data/communes.json';
import * as communesPrecedentesByChefLieu from '../../../../communes-precedentes-by-chef-lieu.json';
import { CommuneCOG, CommuneTypeEnum } from '../types/cog.type';

// Commune actuelle => commune qui existe toujours de nos jour
// Commune precedente => commune qui n'existe plus de nos jour
// Commune ancienne => commune precedente qui n'existe plus dans le COG
// Commune déléguée => commune precedente qui existe encore dans le COG
// Commune chef lieu => commune actuelle qui a des communes précentes

export type CommunePrecedente = {
  code: string;
  nom: string;
};

export type CommuneChefLieu = {
  code: string;
  nom: string;
  anciennesCommunes: CommunePrecedente[];
};

// liste des communes actuelles
const communes = (allCommunes as CommuneCOG[]).filter((c) =>
  [
    CommuneTypeEnum.COMMUNE_ACTUELLE,
    CommuneTypeEnum.ARRONDISSEMENT_MUNICIPAL,
  ].includes(c.type),
);

// index des communes actuelles
const IndexCommunesActuelles: Record<string, CommuneCOG> = keyBy(
  communes,
  'code',
);

// CREATE LIST COMMUNES ANCIENNE
const IndexCommunesPrecedentes: Record<string, CommunePrecedente> = keyBy(
  communesPrecedentesByChefLieu.reduce(
    (acc, cur) => [...acc, ...cur.anciennesCommunes],
    [],
  ),
  'code',
);

export function getCommuneActuelle(codeCommune: string): CommuneCOG {
  return IndexCommunesActuelles[codeCommune];
}

export function getCommunePrecedente(codeCommune: string): CommunePrecedente {
  return IndexCommunesPrecedentes[codeCommune];
}

export function getCommune(
  codeCommune: string,
): CommuneCOG | CommunePrecedente {
  return getCommuneActuelle(codeCommune) || getCommunePrecedente(codeCommune);
}

// codes des communes actuelles
const SetCodeCommunesActuelles = new Set(communes.map((c) => c.code));

// CREATE LIST COMMUNES ANCIENNE
const SetCodeCommunesPrecedentes = new Set(
  flatten(
    communes.map((c) => (c.anciensCodes ? [...c.anciensCodes, c.code] : [])),
  ),
);

/**
 * Vérifie si une commune est actuelle
 */
export function isCommuneActuelle(codeCommune: string): boolean {
  return SetCodeCommunesActuelles.has(codeCommune);
}

/**
 * Vérifie si une commune a existé
 */
export function isCommunePrecendente(codeCommune: string): boolean {
  return SetCodeCommunesPrecedentes.has(codeCommune);
}

/**
 * Vérifie si une commune existe (precedente ou actuelle)
 */
export function isCommune(codeCommune: string): boolean {
  return isCommuneActuelle(codeCommune) || isCommunePrecendente(codeCommune);
}

const IndexCommunesPrecedentsByChefLieu: Record<string, CommuneChefLieu> =
  keyBy(communesPrecedentesByChefLieu, 'code');

export function getCommunesPrecedentesByChefLieu(
  codeCommune: string,
): CommunePrecedente[] {
  return (
    IndexCommunesPrecedentsByChefLieu[codeCommune]?.anciennesCommunes || []
  );
}
