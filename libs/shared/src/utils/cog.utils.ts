import { keyBy, flatten } from 'lodash';
import * as allCommunes from '@etalab/decoupage-administratif/data/communes.json';
import * as allCommunesNouvelles from '../../../../communes-nouvelles.json';
import { CommuneCOG, CommuneTypeEnum } from '../types/cog.type';

const communes = (allCommunes as CommuneCOG[]).filter((c) =>
  [
    CommuneTypeEnum.COMMUNE_ACTUELLE,
    CommuneTypeEnum.ARRONDISSEMENT_MUNICIPAL,
  ].includes(c.type),
);

const communesNouvellesIndex = keyBy(allCommunesNouvelles, 'code');

const communesIndex: Record<string, CommuneCOG> = keyBy(communes, 'code');

const codesCommunesActuelles = new Set(communes.map((c) => c.code));

const codesCommunes = new Set();
for (const commune of communes) {
  codesCommunes.add(commune.code);
  const anciensCodes = commune.anciensCodes || [];
  for (const ancienCode of anciensCodes) {
    codesCommunes.add(ancienCode);
  }
}

export function isCommune(codeCommune: string): boolean {
  return codesCommunes.has(codeCommune);
}

export function isCommuneActuelle(codeCommune: string): boolean {
  return codesCommunesActuelles.has(codeCommune);
}

export function getCommune(codeCommune: string): CommuneCOG {
  return communesIndex[codeCommune];
}

export function getCommunesAnciennesByNouvelle(
  codeCommune: string,
): CommuneCOG[] {
  return communesNouvellesIndex[codeCommune]?.anciennesCommunes || [];
}

// CREATE INDEX COMMUNES
const filteredCommunes: CommuneCOG[] = (communes as Array<CommuneCOG>).filter(
  (c) =>
    [
      CommuneTypeEnum.COMMUNE_ACTUELLE,
      CommuneTypeEnum.ARRONDISSEMENT_MUNICIPAL,
    ].includes(c.type),
);

const indexCommunesActuelle: Record<string, CommuneCOG> = keyBy(
  filteredCommunes,
  'code',
);

export function getCommuneActuelle(codeCommune): CommuneCOG {
  return indexCommunesActuelle[codeCommune];
}

// CREATE LIST COMMUNES ANCIENNE
const filteredCommunesAncienne: string[] = flatten(
  filteredCommunes.map((c) =>
    c.anciensCodes ? [...c.anciensCodes, c.code] : [],
  ),
);

export function isCommuneAncienne(codeCommune: string): boolean {
  return filteredCommunesAncienne.includes(codeCommune);
}
