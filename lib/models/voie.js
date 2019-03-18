const Joi = require('joi')
const {getFilteredPayload} = require('../util/payload')
const mongo = require('../util/mongo')
const position = require('./position')

function cleanNom(nom) {
  return nom.replace(/^\s+/g, '').replace(/\s+$/g, '').replace(/\s\s+/g, ' ')
}

const createSchema = Joi.object().keys({
  nom: Joi.string().min(1).max(200).required(),
  positions: Joi.array().items(
    Joi.lazy(() => position.createSchema).description('position schema')
  )
})

async function create(idBal, codeCommune, payload) {
  if (payload.nom) {
    payload.nom = cleanNom(payload.nom)
  }

  const voie = getFilteredPayload(payload, createSchema)
  Joi.assert(voie, createSchema)

  const isAlreadyExist = await mongo.db.collection('voies').findOne({
    _bal: idBal,
    commune: codeCommune,
    nom: voie.nom
  })

  if (isAlreadyExist) {
    throw new Error('Voie already exists')
  }

  voie._bal = idBal
  voie.code = null
  voie.commune = codeCommune
  voie.positions = voie.positions || []

  mongo.decorateCreation(voie)

  const {insertedId} = await mongo.db.collection('voies').insertOne(voie)
  voie._id = insertedId
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
      voie.code = null
      voie.commune = v.commune
      voie.positions = v.positions || []

      mongo.decorateCreation(voie)

      return voie
    })
    .filter(Boolean)

  if (voies.length === 0) {
    return
  }

  await mongo.db.collection('voies').insertMany(voies)
}

const updateSchema = Joi.object().keys({
  nom: Joi.string().min(1).max(200),
  code: Joi.string().regex(/^[0-9A-Z]\d{3}$/),
  positions: Joi.array().items(
    Joi.lazy(() => position.createSchema).description('position schema')
  )
})

async function update(id, payload) {
  if (payload.nom) {
    payload.nom = cleanNom(payload.nom)
  }

  const voieChanges = getFilteredPayload(payload, updateSchema)
  Joi.assert(voieChanges, updateSchema)

  mongo.decorateModification(voieChanges)
  const {value} = await mongo.db.collection('voies').findOneAndUpdate(
    {_id: mongo.parseObjectID(id)},
    {$set: voieChanges},
    {returnOriginal: false}
  )

  if (!value) {
    throw new Error('Voie not found')
  }

  return value
}

async function fetchOne(id) {
  return mongo.db.collection('voies').findOne({_id: mongo.parseObjectID(id)})
}

async function fetchAll(idBal, codeCommune) {
  return mongo.db.collection('voies').find({
    _bal: idBal,
    commune: codeCommune
  }).toArray()
}

async function remove(id) {
  await mongo.db.collection('voies').deleteOne({_id: mongo.parseObjectID(id)})

  // The following instructions could be defered
  await mongo.db.collection('numeros').deleteMany({_voie: mongo.parseObjectID(id)})
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
  cleanNom
}
