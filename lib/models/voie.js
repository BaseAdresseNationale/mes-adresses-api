const Joi = require('joi')
const {getFilteredPayload} = require('../util/payload')
const mongo = require('../util/mongo')
const position = require('./position')

const createSchema = Joi.object().keys({
  nom: Joi.string().required(),
  positions: Joi.array().items(
    Joi.lazy(() => position.createSchema).description('position schema')
  )
})

async function create(idBal, codeCommune, payload) {
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
  if (options.validate !== false) {
    throw new Error('Validation is not currently available in importMany')
  }

  const voies = rawVoies
    .map(v => {
      const voie = getFilteredPayload(v, createSchema)

      if (options.keepIds) {
        voie._id = v._id
      }

      voie._bal = idBal
      voie.code = null
      voie.commune = v.commune
      voie.positions = voie.positions || []

      mongo.decorateCreation(voie)

      return voie
    })

  await mongo.db.collection('voies').insertMany(voies)
}

const updateSchema = Joi.object().keys({
  nom: Joi.string(),
  code: Joi.string().regex(/^[0-9A-Z]\d{3}$/),
  positions: Joi.array().items(
    Joi.lazy(() => position.createSchema).description('position schema')
  )
})

async function update(id, payload) {
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
  remove
}
