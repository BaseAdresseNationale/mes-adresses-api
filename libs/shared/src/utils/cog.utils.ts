import { keyBy, flatten } from 'lodash';
import * as communes from '@etalab/decoupage-administratif/data/communes.json';
import * as indexCommune from '../../../../index-communes.json';
import { CommuneCOG, CommuneTypeEnum } from '../types/cog.type';

// CREATE INDEX COMMUNES
const filteredCommunes: CommuneCOG[] = (communes as Array<CommuneCOG>).filter(
  (c) =>
    [
      CommuneTypeEnum.COMMUNE_ACTUELLE,
      CommuneTypeEnum.ARRONDISSEMENT_MUNICIPAL,
    ].includes(c.type),
);

const communesIndex: Record<string, CommuneCOG> = keyBy(
  filteredCommunes,
  'code',
);

export function getCommune(codeCommune): CommuneCOG {
  return communesIndex[codeCommune];
}

export function getCommunesAcienneByChefLieu(codeCommune: string): {
  code: string;
  nom: string;
}[] {
  const commune = communesIndex[codeCommune];
  const codeCommunes = [
    ...new Set([commune.code, ...(commune.anciensCodes || [])]),
  ];
  return codeCommunes.map((code) => ({
    code,
    nom: indexCommune[code],
  }));
}

export function getCommuneAncienneNom(codeCommune: string): string {
  return indexCommune[codeCommune];
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
