const got = require('got')

const API_DEPOT_URL = process.env.API_DEPOT_URL || 'https://plateforme.adresse.data.gouv.fr/api-depot(-demo)'

function prepareHabilitation(habilitation) {
  const {_id, strategy, status, createdAt, updatedAt, expiresAt} = habilitation
  const strategyType = strategy ? strategy.type : null

  return {
    _id,
    strategyType,
    status,
    createdAt,
    updatedAt,
    expiresAt,
  }
}

async function createHabilitation(codeCommune) {
  const {body} = await got.post(`${API_DEPOT_URL}/communes/${codeCommune}/habilitations`, {
    headers: {
      authorization: `Token ${process.env.API_DEPOT_TOKEN}`,
    },
    responseType: 'json'
  })

  return prepareHabilitation(body)
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
  const {body} = await got.post(`${API_DEPOT_URL}/habilitations/${habilitationId}/authentication/email/validate-pin-code`, {
    headers: {
      authorization: `Token ${process.env.API_DEPOT_TOKEN}`,
    },
    json: {code},
    responseType: 'json'
  })

  if (body.validated === false) {
    throw new Error(body.error)
  }

  return prepareHabilitation(body)
}

module.exports = {
  prepareHabilitation,
  createHabilitation,
  sendPinCode,
  validatePinCode
}
