import { keyBy, groupBy } from 'lodash';
import * as communes from '@etalab/decoupage-administratif/data/communes.json';
import * as departements from '@etalab/decoupage-administratif/data/departements.json';
import { CommuneCOG } from '../types/cog.type';

const filteredCommunes: CommuneCOG[] = (communes as Array<any>).filter((c) =>
  ['commune-actuelle', 'arrondissement-municipal'].includes(c.type),
);
const communesIndex: Record<string, CommuneCOG> = keyBy(
  filteredCommunes,
  'code',
);
const departementsIndex = keyBy(departements, 'code');

const communesByDepartementIndex = groupBy(communes, 'departement');

export function getCommunesByDepartement(codeDepartement) {
  return communesByDepartementIndex[codeDepartement] || [];
}

export function getCommune(codeCommune) {
  return communesIndex[codeCommune];
}

export function getCodesCommunes() {
  return (communes as CommuneCOG[]).map((c) => c.code);
}

export function getDepartement(codeDepartement) {
  return departementsIndex[codeDepartement];
}
