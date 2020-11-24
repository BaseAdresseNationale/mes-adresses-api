const {groupBy, keyBy} = require('lodash')
const communes = require('@etalab/decoupage-administratif/data/communes.json')
  .filter(c => c.type === 'commune-actuelle')

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

module.exports = {getCommunesByDepartement, getNomCommune}
