const got = require('got')

const BAN_API_URL = process.env.BAN_API_URL || 'https://plateforme.adresse.data.gouv.fr'

function getCommunesSummary() {
  return got(`${BAN_API_URL}/api/communes-summary`).json()
}

module.exports = {getCommunesSummary}
