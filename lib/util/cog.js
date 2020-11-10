const {groupBy} = require('lodash')
const communes = require('@etalab/decoupage-administratif/data/communes.json')
  .filter(c => c.type === 'commune-actuelle')

const communesByDepartementIndex = groupBy(communes, 'departement')

function getCommunesByDepartement(codeDepartement) {
  return communesByDepartementIndex[codeDepartement] || []
}

module.exports = {getCommunesByDepartement}
