const {createGunzip} = require('zlib')
const {groupBy, deburr, uniqBy} = require('lodash')
const csvParse = require('csv-parser')
const got = require('got')
const getStream = require('get-stream').array
const pumpify = require('pumpify')
const {ObjectID} = require('../util/mongo')

const sourceUrlPattern = process.env.BAN_SOURCE_URL_PATTERN || 'https://adresse.data.gouv.fr/data/ban/adresses-odbl/latest/csv/adresses-<codeDepartement>.csv.gz'

function getCodeDepartement(codeCommune) {
  return codeCommune.startsWith('97') ? codeCommune.substr(0, 3) : codeCommune.substr(0, 2)
}

async function extract(codeCommune) {
  const codeDepartement = getCodeDepartement(codeCommune)

  const adresses = await getStream(pumpify.obj(
    got.stream(sourceUrlPattern.replace('<codeDepartement>', codeDepartement), {encoding: null}),
    createGunzip(),
    csvParse({separator: ';'})
  ))

  const adressesCommune = adresses
    .map(a => {
      if (a.code_insee !== codeCommune) {
        return null
      }

      const numero = Number.parseInt(a.numero, 10)
      const suffixe = a.rep.toLowerCase() || null
      const nomVoie = a.nom_voie || a.nom_ld

      if (!nomVoie || !Number.isInteger(numero) || numero === 0 || numero > 5000) {
        return null
      }

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
            coordinates: [parseFloat(a.lon), parseFloat(a.lat)]
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

    const voie = {_id: new ObjectID(), commune: codeCommune, nom: nomVoie}
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

  return {voies, numeros}
}

module.exports = {extract}
