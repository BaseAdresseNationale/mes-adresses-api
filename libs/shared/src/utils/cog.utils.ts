import { keyBy } from 'lodash';
import * as communes from '@etalab/decoupage-administratif/data/communes.json';
import { CommuneCOG } from '../types/cog.type';

const filteredCommunes: CommuneCOG[] = (communes as Array<any>).filter((c) =>
  ['commune-actuelle', 'arrondissement-municipal'].includes(c.type),
);
const communesIndex: Record<string, CommuneCOG> = keyBy(
  filteredCommunes,
  'code',
);

export function getCommune(codeCommune) {
  return communesIndex[codeCommune];
}
