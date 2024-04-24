const {groupBy, keyBy} = require('lodash')

const communes = require('@etalab/decoupage-administratif/data/communes.json')
  .filter(c => ['commune-actuelle', 'arrondissement-municipal'].includes(c.type))

const departements = require('@etalab/decoupage-administratif/data/departements.json')

const communesByDepartementIndex = groupBy(communes, 'departement')
const communesIndex = keyBy(communes, 'code')
const departementsIndex = keyBy(departements, 'code')

function getCommunesByDepartement(codeDepartement) {
  return communesByDepartementIndex[codeDepartement] || []
}

function getCommune(codeCommune) {
  return communesIndex[codeCommune]
}

function getCodesCommunes() {
  return communes.map(c => c.code)
}

function getDepartement(codeDepartement) {
  return departementsIndex[codeDepartement]
}

module.exports = {getCommunesByDepartement, getCommune, getCodesCommunes, getDepartement}
