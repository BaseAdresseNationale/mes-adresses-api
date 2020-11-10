const fetch = require('isomorphic-unfetch')

const GEO_API_URL = process.env.GEO_API_URL || 'https://geo.api.gouv.fr'

async function request(url) {
  const res = await fetch(`${GEO_API_URL}${url}`)

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error('Aucun département trouvé')
    }

    throw new Error('Erreur inattendue')
  }

  return res.json()
}

async function getCodesCommunes(codeDepartement) {
  const communes = await request(`/departements/${codeDepartement}/communes`)
  return communes.map(({code}) => code)
}

module.exports = {getCodesCommunes}
