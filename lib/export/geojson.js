const {keyBy} = require('lodash')
const pumpify = require('pumpify')
const {stringify} = require('../util/geojson-stream')

function voieToToponymeFeature(v) {
  const position = v.positions[0]
  const properties = {
    type: 'toponyme',
    nom: v.nom,
    idVoie: v._id,
    typePosition: position.type
  }

  if (v.complement) {
    properties.complement = v.complement
  }

  return {
    type: 'Feature',
    geometry: position.point,
    properties
  }
}

function voieToLineFeature(v) {
  const properties = {
    type: 'voie-trace',
    nom: v.nom,
    idVoie: v._id
  }

  if (v.complement) {
    properties.complement = v.complement
  }

  return {
    type: 'Feature',
    geometry: v.trace,
    properties
  }
}

function numeroVoieToAdresseFeature(n, v) {
  const position = n.positions[0]
  const properties = {
    type: 'adresse',
    idNumero: n._id,
    nomVoie: v.nom,
    idVoie: v._id,
    numero: n.numero,
    suffixe: n.suffixe,
    typePosition: position.type
  }

  if (v.complement) {
    properties.complement = v.complement
  }

  return {
    type: 'Feature',
    geometry: position.point,
    properties
  }
}

async function transformToGeoJSON({voiesCursor, numerosCursor}) {
  const voies = await voiesCursor.toArray()
  const voiesIndex = keyBy(voies, v => v._id.toHexString())

  const geojsonStream = stringify()

  voies.forEach(v => {
    const {positions, typeNumerotation, trace} = v
    if (positions && positions.length > 0) {
      return geojsonStream.write(voieToToponymeFeature(v))
    }

    if (typeNumerotation === 'metrique' && trace) {
      geojsonStream.write(voieToLineFeature(v))
    }
  })

  return pumpify(
    numerosCursor.stream({transform: n => {
      const v = voiesIndex[n.voie.toHexString()]
      return numeroVoieToAdresseFeature(n, v)
    }}),
    geojsonStream
  )
}

module.exports = {transformToGeoJSON, voieToToponymeFeature, numeroVoieToAdresseFeature}
