const {maxBy} = require('lodash')
const randomColor = require('randomcolor')
const turf = require('@turf/turf')
const {getPositionPriorityByType} = require('@ban-team/adresses-util')

function getPriorityPosition(positions) {
  if (positions.length === 0) {
    return {}
  }

  return maxBy(positions, p => getPositionPriorityByType(p.type))
}

function getColorById(id) {
  return randomColor({
    luminosity: 'dark',
    seed: id.toHexString()
  })
}

function numeroToPointFeature(n) {
  const position = getPriorityPosition(n.positions)
  return turf.feature(
    position.point,
    {
      type: 'adresse',
      id: n._id.toHexString(),
      numero: n.numero,
      suffixe: n.suffixe,
      typePosition: position.type,
      parcelles: n.parcelles,
      certifie: n.certifie,
      idVoie: n.voie.toHexString(),
      idToponyme: n.toponyme ? n.toponyme.toHexString() : null,
      color: getColorById(n.voie)
    }
  )
}

function voieToLineStringFeature(v) {
  return turf.feature(
    v.trace,
    {
      id: v._id.toHexString(),
      type: 'voie-trace',
      nom: v.nom,
      originalGeometry: v.trace,
      color: getColorById(v._id)
    }
  )
}

function voieToPointFeature(v) {
  return turf.feature(
    v.centroid.geometry,
    {
      id: v._id.toHexString(),
      type: 'voie',
      nom: v.nom,
      color: getColorById(v._id)
    }
  )
}

function voiesPointsToGeoJSON(voies) {
  return turf.featureCollection(voies.map(n => voieToPointFeature(n)))
}

function voiesLineStringsToGeoJSON(voies) {
  return turf.featureCollection(voies.map(n => voieToLineStringFeature(n)))
}

function numerosPointsToGeoJSON(numeros) {
  return turf.featureCollection(numeros.map(n => numeroToPointFeature(n)))
}

module.exports = {
  voiesPointsToGeoJSON,
  numerosPointsToGeoJSON,
  voiesLineStringsToGeoJSON,
  getPriorityPosition
}
