const got = require('got')
const mongo = require('./util/mongo')

const API_DEPOT_URL = process.env.API_DEPOT_URL || 'https://plateforme.adresse.data.gouv.fr/api-depot'

function prepareHabilitation(habilitation) {
  const {_id, strategy, emailCommune, status, createdAt, updatedAt, expiresAt} = habilitation
  const strategyType = strategy ? strategy.type : null

  return {
    _id: mongo.parseObjectID(_id),
    strategyType,
    emailCommune,
    status,
    createdAt: createdAt ? new Date(createdAt) : null,
    updatedAt: updatedAt ? new Date(updatedAt) : null,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
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
  return got.post(`${API_DEPOT_URL}/habilitations/${habilitationId}/authentication/email/validate-pin-code`, {
    headers: {
      authorization: `Token ${process.env.API_DEPOT_TOKEN}`,
    },
    json: {code},
    responseType: 'json'
  })
}

module.exports = {
  prepareHabilitation,
  createHabilitation,
  sendPinCode,
  validatePinCode
}
