const cadastre = require('../cadastre-communes.json')

function checkCadastre(communeCode) {
  return {hasCadastre: cadastre.includes(communeCode)}
}

module.exports = {checkCadastre}
