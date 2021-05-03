const {keyBy} = require('lodash')
const pumpify = require('pumpify')
const {stringify} = require('../util/geojson-stream')

function voieToLineFeature(v) {
  const properties = {
    type: 'voie-trace',
    nom: v.nom,
    idVoie: v._id
  }

  return {
    type: 'Feature',
    geometry: v.trace,
    properties
  }
}

function numeroVoieToAdresseFeature(n, v, t) {
  const nomToponyme = t ? t.nom : null
  const position = n.positions[0]
  const properties = {
    type: 'adresse',
    idNumero: n._id,
    nomVoie: v.nom,
    idVoie: v._id,
    idToponyme: n.toponyme,
    nomToponyme,
    numero: n.numero,
    suffixe: n.suffixe,
    typePosition: position.type
  }

  return {
    type: 'Feature',
    geometry: position.point,
    properties
  }
}

async function transformToGeoJSON({voiesCursor, numerosCursor, toponymesCursor}) {
  const voies = await voiesCursor.toArray()
  const toponymes = await toponymesCursor.toArray()
  const voiesIndex = keyBy(voies, v => v._id.toHexString())
  const toponymesIndex = keyBy(toponymes, t => t._id.toHexString())

  const geojsonStream = stringify()

  voies.forEach(v => {
    const {typeNumerotation, trace} = v
    if (typeNumerotation === 'metrique' && trace) {
      geojsonStream.write(voieToLineFeature(v))
    }
  })

  return pumpify(
    numerosCursor.stream({transform: n => {
      const v = voiesIndex[n.voie.toHexString()]
      const t = n.toponyme ? toponymesIndex[n.toponyme.toHexString()] : null
      return numeroVoieToAdresseFeature(n, v, t)
    }}),
    geojsonStream
  )
}

module.exports = {transformToGeoJSON, numeroVoieToAdresseFeature}
