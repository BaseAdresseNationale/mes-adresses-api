import { keyBy, flatten } from 'lodash';
import * as communes from '@etalab/decoupage-administratif/data/communes.json';
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

export function getCommuneAcienneByChefLieu(codeCommune: string): string[] {
  const commune = communesIndex[codeCommune];
  const codeSet = new Set([commune.code, ...(commune.anciensCodes || [])]);
  return [...codeSet];
}

// CREATE INDEX COMMUNES DELEGUEE
const filteredCommunesDeleguee: CommuneCOG[] = (
  communes as Array<CommuneCOG>
).filter((c) => [CommuneTypeEnum.COMMUNE_DELEGUEE].includes(c.type));

const CommunesDelegueeIndex: Record<string, CommuneCOG> = keyBy(
  filteredCommunesDeleguee,
  'code',
);

export function getCommuneDeleguee(codeCommune: string): CommuneCOG {
  return CommunesDelegueeIndex[codeCommune];
}

// CREATE LIST COMMUNES ANCIENNE
const filteredCommunesAncienne: string[] = flatten(
  filteredCommunes.map((c) => c.anciensCodes || []),
);

export function isCommuneAncienne(codeCommune: string): boolean {
  return filteredCommunesAncienne.includes(codeCommune);
}
