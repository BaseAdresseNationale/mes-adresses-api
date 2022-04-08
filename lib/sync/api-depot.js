const got = require('got')
const hasha = require('hasha')
const createError = require('http-errors')

const API_DEPOT_URL = process.env.API_DEPOT_URL || 'https://plateforme.adresse.data.gouv.fr/api-depot'
const {API_DEPOT_CLIENT_SECRET} = process.env

async function getCurrentRevision(codeCommune) {
  const response = await got(
    `${API_DEPOT_URL}/communes/${codeCommune}/current-revision`,
    {responseType: 'json', throwHttpErrors: false}
  )

  if (response.statusCode === 200) {
    return response.body
  }

  if (response.statusCode === 404) {
    return
  }

  throw new Error(response.body.message)
}

async function getCurrentRevisions(publishedSince = new Date('1970-01-01')) {
  return got(`${API_DEPOT_URL}/current-revisions?publishedSince=${publishedSince.toISOString()}`).json()
}

async function publishNewRevision(codeCommune, balId, balFile, habilitationId) {
  const defaultHeaders = {
    Authorization: `Token ${API_DEPOT_CLIENT_SECRET}`
  }

  const revision = await got.post(
    `${API_DEPOT_URL}/communes/${codeCommune}/revisions`,
    {
      json: {context: {extras: {balId}}},
      headers: defaultHeaders
    }
  ).json()

  await got.put(
    `${API_DEPOT_URL}/revisions/${revision._id}/files/bal`,
    {
      body: balFile,
      headers: {
        ...defaultHeaders,
        'Content-Type': 'application/csv',
        'Content-MD5': hasha(balFile, {algorithm: 'md5'})
      }
    }
  ).json()

  const computedRevision = await got.post(
    `${API_DEPOT_URL}/revisions/${revision._id}/compute`,
    {
      headers: defaultHeaders
    }
  ).json()

  if (!computedRevision.validation.valid) {
    console.log(`Export BAL non valide : ${balId}`)
    console.log(computedRevision.validation.errors)
    throw createError(500, 'La fichier BAL n’est pas valide. Merci de contacter le support.')
  }

  const publishedRevision = await got.post(
    `${API_DEPOT_URL}/revisions/${revision._id}/publish`,
    {
      json: {habilitationId},
      headers: defaultHeaders
    }
  ).json()

  return publishedRevision
}

module.exports = {getCurrentRevision, publishNewRevision, getCurrentRevisions}
