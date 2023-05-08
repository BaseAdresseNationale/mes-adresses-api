const {keyBy, maxBy, groupBy} = require('lodash')
const randomColor = require('randomcolor')
const centroid = require('@turf/centroid').default
const {getPositionPriorityByType} = require('@ban-team/adresses-util')

function getPriorityPosition(positions) {
  if (positions.length === 0) {
    return {}
  }

  return maxBy(positions, p => getPositionPriorityByType(p.type))
}

function numeroToPointFeature(n, v, t) {
  const position = getPriorityPosition(n.positions)
  return {
    type: 'Feature',
    geometry: position.point,
    properties: {
      type: 'adresse',
      id: n._id.toHexString(),
      idNumero: n._id.toHexString(),
      nomVoie: v.nom,
      idVoie: v._id.toHexString(),
      idToponyme: n.toponyme ? n.toponyme.toHexString() : null,
      nomToponyme: t ? t.nom : null,
      numero: n.numero,
      suffixe: n.suffixe,
      typePosition: position.type,
      parcelles: n.parcelles,
      certifie: n.certifie,
      color: randomColor({
        luminosity: 'dark',
        seed: v._id.toHexString()
      })
    }
  }
}

function voieToLineFeature(v) {
  return {
    type: 'Feature',
    geometry: v.trace,
    properties: {
      id: v._id.toHexString(),
      type: 'voie-trace',
      nom: v.nom,
      idVoie: v._id.toHexString(),
      color: randomColor({
        luminosity: 'dark',
        seed: v._id.toHexString()
      }),
      originalGeometry: v.trace
    }
  }
}

function fillVoieProperties(v) {
  return {
    id: v._id.toHexString(),
    type: 'voie',
    idVoie: v._id.toHexString(),
    nomVoie: v.nom,
    color: randomColor({
      luminosity: 'dark',
      seed: v._id.toHexString()
    })
  }
}

function voieToPointFeature(v, numeros) {
  const numerosFeatures = numeros.map(n => {
    const position = getPriorityPosition(n.positions)
    return {
      type: 'Feature',
      geometry: position.point,
    }
  })

  let voieFeature = null
  if (numerosFeatures.length > 0) {
    voieFeature = centroid({
      type: 'FeatureCollection',
      features: numerosFeatures
    })
    voieFeature.properties = fillVoieProperties(v)
  } else if (v.typeNumerotation === 'metrique' && v.trace) {
    voieFeature = centroid(v.trace)
    voieFeature.properties = fillVoieProperties(v)
  }

  return voieFeature
}

function voiesToLineGeoJSON(voies) {
  const features = voies
    .filter(v => v.typeNumerotation === 'metrique' && v.trace)
    .map(v => voieToLineFeature(v))
  return {type: 'FeatureCollection', features}
}

function voiesToPointGeoJSON(voies, numeros) {
  const numerosByVoie = groupBy(numeros, 'voie')
  const features = voies
    .map(v => voieToPointFeature(v, numerosByVoie[v._id] || []))
    .filter(f => f !== null)
  return {type: 'FeatureCollection', features}
}

function numerosToGeoJSON(voies, toponymes, numeros) {
  const voiesIndex = keyBy(voies, v => v._id.toHexString())
  const toponymesIndex = keyBy(toponymes, t => t._id.toHexString())
  const features = numeros
    .map(n => {
      const v = voiesIndex[n.voie.toHexString()]
      const t = n.toponyme ? toponymesIndex[n.toponyme.toHexString()] : null
      return numeroToPointFeature(n, v, t)
    })

  return {type: 'FeatureCollection', features}
}

module.exports = {voiesToPointGeoJSON, numerosToGeoJSON, voiesToLineGeoJSON}
