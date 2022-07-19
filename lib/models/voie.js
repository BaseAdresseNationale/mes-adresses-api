const Joi = require('joi')
const {getLabel} = require('@ban-team/validateur-bal')
const {getFilteredPayload} = require('../util/payload')
const mongo = require('../util/mongo')
const {validPayload} = require('../util/payload')
const Numero = require('./numero')
const nomAltSchema = require('./nom-alt')
const {getNomAltDefault} = require('./nom-alt')

function cleanNom(nom) {
  return nom.replace(/^\s+/g, '').replace(/\s+$/g, '').replace(/\s\s+/g, ' ')
}

const nomValidation = Joi.string()
  .min(3).message(getLabel('voie_nom.trop_court'))
  .max(200).message(getLabel('voie_nom.trop_long'))

const createSchema = Joi.object().keys({
  nom: nomValidation.required(),
  typeNumerotation: Joi.string().valid('numerique', 'metrique'),
  trace: Joi.object({
    type: Joi.string().valid('LineString').required(),
    coordinates: Joi.array().required()
  }).allow(null),
  nomAlt: nomAltSchema.createSchema.allow(null)
})

async function create(baseLocale, payload) {
  if (payload.nom) {
    payload.nom = cleanNom(payload.nom)
  }

  const voie = validPayload(payload, createSchema)

  voie._id = new mongo.ObjectId()
  voie._bal = baseLocale._id
  voie.code = null
  voie.commune = baseLocale.commune
  voie.typeNumerotation = voie.typeNumerotation || 'numerique'
  voie.trace = voie.trace || null
  voie.nomAlt = getNomAltDefault(voie.nomAlt)

  mongo.decorateCreation(voie)

  await mongo.db.collection('voies').insertOne(voie)
  await mongo.touchDocument('bases_locales', voie._bal, voie._created)

  return voie
}

async function importMany(idBal, rawVoies, options = {}) {
  if (!idBal) {
    throw new Error('idBal is required')
  }

  if (options.validate !== false) {
    throw new Error('Validation is not currently available in importMany')
  }

  const voies = rawVoies
    .map(v => {
      if (v.nom) {
        v.nom = cleanNom(v.nom)
      }

      const voie = getFilteredPayload(v, createSchema)

      if (!v.commune || !v.nom) {
        return null
      }

      if (options.keepIds) {
        voie._id = v._id
      }

      voie._bal = idBal
      voie.code = v.code || null
      voie.commune = v.commune
      voie.nomAlt = getNomAltDefault(v.nomAlt)

      if (v._updated && v._created) {
        voie._created = v._created
        voie._updated = v._updated
      } else {
        mongo.decorateCreation(voie)
      }

      return voie
    })
    .filter(Boolean)

  if (voies.length === 0) {
    return
  }

  await mongo.db.collection('voies').insertMany(voies)
}

const updateSchema = Joi.object().keys({
  nom: nomValidation,
  code: Joi.string().regex(/^[\dA-Z]\d{3}$/).allow(null),
  typeNumerotation: Joi.string().valid('numerique', 'metrique'),
  trace: Joi.object({
    type: Joi.string().valid('LineString').required(),
    coordinates: Joi.array().required()
  }).allow(null),
  nomAlt: nomAltSchema.updateSchema.allow(null)
})

async function update(id, payload) {
  if (payload.nom) {
    payload.nom = cleanNom(payload.nom)
  }

  const voieChanges = validPayload(payload, updateSchema)

  if (voieChanges.nomAlt) {
    voieChanges.nomAlt = Object.keys(voieChanges.nomAlt).length > 0 ? voieChanges.nomAlt : null
  }

  mongo.decorateModification(voieChanges)
  const {value} = await mongo.db.collection('voies').findOneAndUpdate(
    {_id: mongo.parseObjectID(id)},
    {$set: voieChanges},
    {returnDocument: 'after'}
  )

  if (!value) {
    throw new Error('Voie not found')
  }

  await mongo.touchDocument('bases_locales', value._bal, value._updated)

  return value
}

async function fetchOne(id) {
  return mongo.db.collection('voies').findOne({_id: mongo.parseObjectID(id)})
}

async function fetchAll(idBal) {
  return mongo.db.collection('voies').find({
    _bal: idBal
  }).toArray()
}

async function remove(id) {
  const {value} = await mongo.db.collection('voies').findOneAndDelete({
    _id: mongo.parseObjectID(id)
  })

  // The following instructions could be defered
  await mongo.db.collection('numeros').deleteMany({voie: mongo.parseObjectID(id)})

  // Update base locales
  await mongo.touchDocument('bases_locales', value._bal)
}

async function getVoie(id) {
  const voie = await mongo.db.collection('voies').findOne({_id: mongo.parseObjectID(id)})
  const nbNumeros = await mongo.db.collection('numeros').countDocuments({voie: mongo.parseObjectID(id)})
  const nbNumerosCertifies = await mongo.db.collection('numeros').countDocuments({voie: mongo.parseObjectID(id), certifie: true})

  return {...voie, nbNumeros, nbNumerosCertifies}
}

async function batchUpdateNumeros(idVoie, changes) {
  const now = new Date()
  const {certifie} = validPayload(changes, Numero.updateSchema)

  const voie = mongo.db.collection('voies').findOne({_id: mongo.parseObjectID(idVoie)})
  const {modifiedCount} = await mongo.db.collection('numeros').updateMany({
    $and: [
      {voie: mongo.parseObjectID(idVoie)},
      {certifie: {$ne: Boolean(certifie)}}
    ]
  }, {
    $set: {certifie: Boolean(certifie), _updated: now}
  })

  if (modifiedCount > 0) {
    await Promise.all([
      mongo.touchDocument('bases_locales', voie._bal, now),
      mongo.touchDocument('voies', voie._id, now)
    ])
  }

  return {changes: {certifie}, modifiedCount}
}

module.exports = {
  create,
  importMany,
  createSchema,
  update,
  updateSchema,
  fetchOne,
  fetchAll,
  remove,
  cleanNom,
  batchUpdateNumeros,
  getVoie
}
