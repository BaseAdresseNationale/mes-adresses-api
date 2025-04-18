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

const indexCommunesActuelle: Record<string, CommuneCOG> = keyBy(
  filteredCommunes,
  'code',
);

export function getCommuneActuelle(codeCommune): CommuneCOG {
  return indexCommunesActuelle[codeCommune];
}

export function getCommunesAcienneByChefLieu(codeCommune: string): {
  code: string;
  nom: string;
}[] {
  const commune = indexCommunesActuelle[codeCommune];
  if (commune) {
    const codeCommunes = [
      ...new Set([commune.code, ...(commune.anciensCodes || [])]),
    ];
    return codeCommunes.map((code) => ({
      code,
      nom: indexCommune[code],
    }));
  }
  return [];
}

export function getCommune(code: string): { code: string; nom: string } {
  if (indexCommunesActuelle[code]) {
    return indexCommunesActuelle[code];
  } else if (indexCommune[code]) {
    return { code, nom: indexCommune[code] };
  }
}

export function getCommuneAncienne(code: string): {
  code: string;
  nom: string;
} {
  if (code === '01187') {
    return { code, nom: 'Haut Valromey' };
  } else if (code === '16023') {
    return { code, nom: 'Aunac-sur-Charente' };
  } else if (code === '33008') {
    return { code, nom: 'Porte-de-Benauge' };
  } else if (code === '39576') {
    return { code, nom: 'Val-Sonnette' };
  }
  return { code, nom: indexCommune[code] };
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
