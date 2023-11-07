import { mapValues } from 'lodash';
import { beautify } from '@ban-team/adresses-util/lib/voies';

export function beautifyUppercased(str) {
  return str === str.toUpperCase() ? beautify(str) : str;
}

export function beautifyNomAlt(nomAlt) {
  if (nomAlt) {
    return mapValues(nomAlt, (nom) => beautifyUppercased(nom));
  }
}

export function cleanNom(nom) {
  return nom.replace(/^\s+/g, '').replace(/\s+$/g, '').replace(/\s\s+/g, ' ');
}
