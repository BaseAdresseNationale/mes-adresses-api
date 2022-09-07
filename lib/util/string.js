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

module.exports = {beautifyUppercased, beautifyNomAlt}
