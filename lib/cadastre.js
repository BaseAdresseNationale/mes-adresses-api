const cadastre = require('../cadastre-communes.json')

function checkHasCadastre(communeCode) {
  return cadastre.includes(communeCode)
}

module.exports = {checkHasCadastre}
