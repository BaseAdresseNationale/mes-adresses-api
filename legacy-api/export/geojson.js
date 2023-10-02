const {maxBy} = require('lodash')
const randomColor = require('randomcolor')
const turf = require('@turf/turf')
const {getPositionPriorityByType} = require('@ban-team/adresses-util')

// Paul Tol's vibrant palette for accessibility
const colorblindFriendlyHues = ['#EE7733', '#0077BB', '#33BBEE', '#EE3377', '#CC3311', '#009988']

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

// Returns a color of the palette based on the bal ID
function getColorblindFriendlyHue(id) {
  const slicedId = id.toHexString().slice(19)

  return colorblindFriendlyHues[Number.parseInt(slicedId, 16) % colorblindFriendlyHues.length]
}

function getFeatureColor(id, colorblindMode) {
  return colorblindMode ? getColorblindFriendlyHue(id) : getColorById(id)
}

function numeroToPointFeature(n, colorblindMode) {
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
      color: getFeatureColor(n.voie, colorblindMode)
    }
  )
}

function voieToLineStringFeature(v, colorblindMode) {
  return turf.feature(
    v.trace,
    {
      id: v._id.toHexString(),
      type: 'voie-trace',
      nom: v.nom,
      originalGeometry: v.trace,
      color: getFeatureColor(v._id, colorblindMode)
    }
  )
}

function voieToPointFeature(v, colorblindMode) {
  return turf.feature(
    v.centroid.geometry,
    {
      id: v._id.toHexString(),
      type: 'voie',
      nom: v.nom,
      color: getFeatureColor(v._id, colorblindMode)
    }
  )
}

function voiesPointsToGeoJSON(voies, colorblindMode) {
  return turf.featureCollection(voies.map(n => voieToPointFeature(n, colorblindMode)))
}

function voiesLineStringsToGeoJSON(voies, colorblindMode) {
  return turf.featureCollection(voies.map(n => voieToLineStringFeature(n, colorblindMode)))
}

function numerosPointsToGeoJSON(numeros, colorblindMode) {
  return turf.featureCollection(numeros.map(n => numeroToPointFeature(n, colorblindMode)))
}

module.exports = {
  voiesPointsToGeoJSON,
  numerosPointsToGeoJSON,
  voiesLineStringsToGeoJSON,
  getPriorityPosition
}
