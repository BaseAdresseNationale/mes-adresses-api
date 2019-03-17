const {pipeline} = require('stream')
const {groupBy, deburr, uniqBy} = require('lodash')
const csvParse = require('csv-parser')
const got = require('got')
const decompress = require('decompress')
const getStream = require('get-stream').array
const intoStream = require('into-stream')
const {ObjectID} = require('../util/mongo')

async function downloadBanArchive(codeDepartement) {
  const url = `https://adresse.data.gouv.fr/data/ban-v0/BAN_licence_gratuite_repartage_${codeDepartement}.zip`
  const response = await got(url, {encoding: null})
  return response.body
}

async function getBanFile(codeDepartement) {
  const archive = await downloadBanArchive(codeDepartement)
  const files = await decompress(archive)
  const file = files.find(f => f.path.endsWith('csv')).data
  return file
}

function getCodeDepartement(codeCommune) {
  return codeCommune.startsWith('97') ? codeCommune.substr(0, 3) : codeCommune.substr(0, 2)
}

async function extract(codeCommune) {
  const codeDepartement = getCodeDepartement(codeCommune)
  const banFile = await getBanFile(codeDepartement)

  const adresses = await getStream(pipeline(
    intoStream(banFile),
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
          source: 'BAN v0',
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
