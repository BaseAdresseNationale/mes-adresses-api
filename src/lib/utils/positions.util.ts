import { maxBy } from 'lodash';
import { getPositionPriorityByType } from '@ban-team/adresses-util';

export function getPriorityPosition(positions) {
  return positions.length === 0
    ? {}
    : maxBy(positions, (p) => getPositionPriorityByType(p.type));
}
