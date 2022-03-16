const got = require('got')

const API_DEPOT_URL = process.env.API_DEPOT_URL || 'https://plateforme.adresse.data.gouv.fr/api-depot'
const {API_DEPOT_CLIENT_SECRET} = process.env

const client = got.extend({
  prefixUrl: API_DEPOT_URL,
  headers: {
    authorization: `Token ${API_DEPOT_CLIENT_SECRET}`
  }
})

async function createHabilitation(codeCommune) {
  return client.post(`communes/${codeCommune}/habilitations`).json()
}

async function fetchHabilitation(habilitationId) {
  return client.get(`habilitations/${habilitationId}`).json()
}

async function sendPinCode(habilitationId) {
  return client.post(`habilitations/${habilitationId}/authentication/email/send-pin-code`, {
    throwHttpErrors: false,
  }).json()
}

async function validatePinCode(habilitationId, code) {
  return client.post(`habilitations/${habilitationId}/authentication/email/validate-pin-code`, {
    json: {code}
  }).json()
}

module.exports = {
  createHabilitation,
  sendPinCode,
  validatePinCode,
  fetchHabilitation
}
