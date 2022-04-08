const {groupBy, deburr, uniqBy} = require('lodash')
const csvParse = require('csv-parser')
const got = require('got')
const getStream = require('get-stream').array
const pumpify = require('pumpify')
const {ObjectId} = require('../util/mongo')
const {extractFromCsv} = require('./extract-csv')

const BAN_API_URL = process.env.BAN_API_URL || 'https://plateforme.adresse.data.gouv.fr'
const API_DEPOT_URL = process.env.API_DEPOT_URL || 'https://plateforme.adresse.data.gouv.fr/api-depot'

async function extractFromBAN(codeCommune) {
  const adresses = await getStream(pumpify.obj(
    got.stream(`${BAN_API_URL}/ban/communes/${codeCommune}/download/csv-legacy/adresses`, {responseType: 'buffer'}),
    csvParse({separator: ';'})
  ))

  const adressesCommune = adresses
    .map(a => {
      const numero = Number.parseInt(a.numero, 10)
      const suffixe = a.rep.toLowerCase() || null
      const nomVoie = a.nom_voie

      const adresse = {
        codeCommune,
        nomVoie,
        numero,
        suffixe,
        positions: []
      }

      if (a.lat && a.lon) {
        adresse.positions.push({
          type: 'inconnue',
          source: 'BAN',
          point: {
            type: 'Point',
            coordinates: [Number.parseFloat(a.lon), Number.parseFloat(a.lat)]
          }
        })
      }

      return adresse
    })
    .filter(Boolean)

  const voies = []
  const numeros = []
  const groups = groupBy(adressesCommune, a => deburr(a.nomVoie.toLowerCase()))

  Object.keys(groups).forEach(k => {
    const adressesVoie = groups[k]
    const {nomVoie, codeCommune} = adressesVoie[0]

    const voie = {_id: new ObjectId(), commune: codeCommune, nom: nomVoie}
    voies.push(voie)

    uniqBy(adressesVoie, a => `${a.numero}${a.suffixe}`)
      .map(a => ({
        voie: voie._id,
        commune: codeCommune,
        numero: a.numero,
        suffixe: a.suffixe,
        positions: a.positions
      }))
      .forEach(n => numeros.push(n))
  })

  return {voies, numeros, toponymes: []}
}

async function extractFromApiDepot(codeCommune) {
  try {
    const currentRevisionUrl = `${API_DEPOT_URL}/communes/${codeCommune}/current-revision`
    const balFileData = await got(`${currentRevisionUrl}/files/bal/download`).buffer()
    return extractFromCsv(balFileData, codeCommune)
  } catch {}
}

async function extract(codeCommune) {
  const data = await extractFromApiDepot(codeCommune)

  if (data) {
    return data
  }

  return extractFromBAN(codeCommune)
}

module.exports = {extract, extractFromBAN}
