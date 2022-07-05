const got = require('got')
const {extractFromCsv} = require('./extract-csv')

const BAN_API_URL = process.env.BAN_API_URL || 'https://plateforme.adresse.data.gouv.fr'
const API_DEPOT_URL = process.env.API_DEPOT_URL || 'https://plateforme.adresse.data.gouv.fr/api-depot'

async function extractFromBAN(codeCommune) {
  try {
    const balUrl = `${BAN_API_URL}/ban/communes/${codeCommune}/download/csv-bal/adresses`
    const balFileData = await got(balUrl).buffer()
    return extractFromCsv(balFileData, codeCommune)
  } catch {}
}

async function extractFromApiDepot(codeCommune) {
  try {
    const currentRevisionUrl = `${API_DEPOT_URL}/communes/${codeCommune}/current-revision`
    const balFileData = await got(`${currentRevisionUrl}/files/bal/download`).buffer()
    return extractFromCsv(balFileData, codeCommune)
  } catch {}
}

async function extract(codeCommune) {
  const data = await extractFromApiDepot(codeCommune) || await extractFromBAN(codeCommune)

  if (data) {
    return data
  }

  console.error(`Aucune adresse n’a pu être extraite avec le code commune: ${codeCommune}`)
  return {voies: [], numeros: [], toponymes: []}
}

module.exports = {extract, extractFromBAN}
