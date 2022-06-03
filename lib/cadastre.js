const cadastre = require('../cadastre-communes.json')

function checkCadastre(communeCode) {
  return cadastre.includes(communeCode)
}

module.exports = {checkCadastre}
