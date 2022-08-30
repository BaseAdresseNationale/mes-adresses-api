const {mapValues} = require('lodash')
const {beautify} = require('@etalab/adresses-util/lib/voies')

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

module.exports = {beautifyUppercased, beautifyNomAlt}
