const bbox = require('@turf/bbox').default
const {groupBy} = require('lodash')
const mongo = require('../util/mongo')

async function expandBalWithNumeros(bal) {
  const numeros = await mongo.db.collection('numeros')
    .find({_bal: mongo.parseObjectID(bal._id), _deleted: null})
    .project({certifie: 1, numero: 1, comment: 1})
    .toArray()

  bal.nbNumeros = numeros.length
  bal.nbNumerosCertifies = numeros.filter(n => n.certifie === true).length
  bal.isAllCertified = bal.nbNumeros > 0 && bal.nbNumeros === bal.nbNumerosCertifies
  bal.commentedNumeros = numeros.filter(n => n.comment !== undefined && n.comment !== null && n.comment !== '')

  return bal
}

async function expandVoieOrToponyme(model, idProperty) {
  const numeros = await mongo.db.collection('numeros')
    .find({[idProperty]: mongo.parseObjectID(model._id), _deleted: null})
    .project({voie: 1, toponyme: 1, positions: 1, certifie: 1, numero: 1, comment: 1})
    .toArray()

  const numerosByModel = groupBy(numeros, idProperty)
  expandVoieOrToponymeWithHisNumeros(model, numerosByModel[model._id])
  return model
}

async function expandVoiesOrToponymes(balId, models, idProperty) {
  const numeros = await mongo.db.collection('numeros')
    .find({_bal: mongo.parseObjectID(balId), _deleted: null})
    .project({voie: 1, toponyme: 1, positions: 1, certifie: 1, numero: 1, comment: 1})
    .toArray()

  const numerosByModel = groupBy(numeros, idProperty)
  models.forEach(m => {
    expandVoieOrToponymeWithHisNumeros(m, numerosByModel[m._id])
  })
  return models
}

function positionToFeatureCollection(positions) {
  return {
    type: 'FeatureCollection',
    features: positions.map(p => ({
      type: 'Feature',
      geometry: p.point,
    }))
  }
}

async function expandVoieOrToponymeWithHisNumeros(model, numeros = []) {
  model.nbNumeros = numeros.length
  model.nbNumerosCertifies = numeros.filter(n => n.certifie === true).length
  model.isAllCertified = model.nbNumeros > 0 && model.nbNumeros === model.nbNumerosCertifies
  model.commentedNumeros = numeros.filter(n => n.comment !== undefined && n.comment !== null && n.comment !== '')

  const positions = numeros
    .filter(n => n.positions && n.positions.length > 0)
    .reduce((acc, n) => [...acc, ...n.positions], [])
  if (positions.length > 0) {
    const featuresCollection = positionToFeatureCollection(positions)
    model.bbox = bbox(featuresCollection)
  } else if (model.positions && model.positions.length > 0) {
    const featuresCollection = positionToFeatureCollection(model.positions)
    model.bbox = bbox(featuresCollection)
  } else if (model.trace) {
    model.bbox = bbox(model.trace)
  }
}

module.exports = {expandBalWithNumeros, expandVoiesOrToponymes, expandVoieOrToponyme}
