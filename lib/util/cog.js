const {groupBy, keyBy} = require('lodash')
const communes = require('@etalab/decoupage-administratif/data/communes.json')
  .filter(c => ['commune-actuelle', 'arrondissement-municipal'].includes(c.type))

const communesByDepartementIndex = groupBy(communes, 'departement')
const communesIndex = keyBy(communes, 'code')

function getCommunesByDepartement(codeDepartement) {
  return communesByDepartementIndex[codeDepartement] || []
}

function getNomCommune(codeCommune) {
  if (!communesIndex[codeCommune]) {
    throw new Error(`Commune ${codeCommune} inconnue`)
  }

  return communesIndex[codeCommune].nom
}

function getCodesCommunes() {
  return communes.map(c => c.code)
}

module.exports = {getCommunesByDepartement, getNomCommune, getCodesCommunes}
