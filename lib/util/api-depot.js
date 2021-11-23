const got = require('got')

const API_BAN_URL = process.env.API_BAN_URL || 'https://api-depot.adresse.data.gouv.fr/'

async function createHabilitation(codeCommune) {
  const {body} = await got.post(`${API_BAN_URL}/communes/${codeCommune}/habilitations`, {
    headers: {
      authorization: `Token ${process.env.API_BAN_TOKEN}`,
    },
    responseType: 'json'
  })

  return body
}

function sendPinCode(habilitationId) {
  return got.post(`${API_BAN_URL}/habilitations/${habilitationId}/authentification/email/send-pin-code`, {
    headers: {
      authorization: `Token ${process.env.API_BAN_TOKEN}`,
    }
  })
}

async function validatePinCode(habilitationId, code) {
  const {body} = await got.post(`${API_BAN_URL}/habilitations/${habilitationId}/authentification/email/validate-pin-code`, {
    headers: {
      authorization: `Token ${process.env.API_BAN_TOKEN}`,
    },
    json: {code},
    responseType: 'json'
  })

  if (body.validated === false) {
    throw new Error(body.error)
  }

  return body
}

module.exports = {createHabilitation, sendPinCode, validatePinCode}
