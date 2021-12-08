const got = require('got')

const API_DEPOT_URL = process.env.API_DEPOT_URL || 'https://plateforme.adresse.data.gouv.fr/api-depot'

async function createHabilitation(codeCommune) {
  const {body} = await got.post(`${API_DEPOT_URL}/communes/${codeCommune}/habilitations`, {
    headers: {
      authorization: `Token ${process.env.API_DEPOT_TOKEN}`,
    },
    responseType: 'json'
  })

  return body
}

async function sendPinCode(habilitationId) {
  return got.post(`${API_DEPOT_URL}/habilitations/${habilitationId}/authentication/email/send-pin-code`, {
    headers: {
      authorization: `Token ${process.env.API_DEPOT_TOKEN}`,
    },
    responseType: 'json'
  })
}

async function validatePinCode(habilitationId, code) {
  return got.post(`${API_DEPOT_URL}/habilitations/${habilitationId}/authentication/email/validate-pin-code`, {
    headers: {
      authorization: `Token ${process.env.API_DEPOT_TOKEN}`,
    },
    json: {code},
    responseType: 'json'
  })
}

module.exports = {
  createHabilitation,
  sendPinCode,
  validatePinCode
}