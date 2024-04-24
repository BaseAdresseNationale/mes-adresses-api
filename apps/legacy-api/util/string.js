const {mapValues} = require('lodash')
const {beautify} = require('@ban-team/adresses-util/lib/voies')

function beautifyUppercased(str) {
  return str === str.toUpperCase()
    ? beautify(str)
    : str
}

function beautifyNomAlt(nomAlt) {
  if (nomAlt) {
    return mapValues(nomAlt, nom => beautifyUppercased(nom))
  }
}

function cleanNom(nom) {
  return nom.replace(/^\s+/g, '').replace(/\s+$/g, '').replace(/\s\s+/g, ' ')
}

module.exports = {beautifyUppercased, beautifyNomAlt, cleanNom}
