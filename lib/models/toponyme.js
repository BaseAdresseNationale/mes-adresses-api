const Joi = require('joi')
const mongo = require('../util/mongo')
const {validPayload} = require('../util/payload')
const position = require('./position')
const {cleanNom} = require('./voie')

const createSchema = Joi.object().keys({
  nom: Joi.string().min(1).max(200).required(),
  positions: Joi.array().items(
    position.createSchema
  )
})

async function create(idBal, codeCommune, payload) {
  if (payload.nom) {
    payload.nom = cleanNom(payload.nom)
  }

  const toponyme = validPayload(payload, createSchema)
  const baseLocale = await mongo.db.collection('bases_locales').findOne({_id: mongo.parseObjectID(idBal)})

  if (!baseLocale) {
    throw new Error('Base locale not found')
  }

  toponyme._bal = baseLocale._id
  toponyme.commune = codeCommune
  toponyme.positions = toponyme.positions || []

  mongo.decorateCreation(toponyme)

  const {insertedId} = await mongo.db.collection('toponymes').insertOne(toponyme)
  toponyme._id = insertedId

  await mongo.touchDocument('bases_locales', toponyme._bal, toponyme._created)

  return toponyme
}

const updateSchema = Joi.object().keys({
  nom: Joi.string().min(1).max(200),
  positions: Joi.array().items(
    position.createSchema
  )
})

async function update(id, payload) {
  if (payload.nom) {
    payload.nom = cleanNom(payload.nom)
  }

  const toponymeChanges = validPayload(payload, updateSchema)

  mongo.decorateModification(toponymeChanges)
  const {value} = await mongo.db.collection('toponymes').findOneAndUpdate(
    {_id: mongo.parseObjectID(id)},
    {$set: toponymeChanges},
    {returnOriginal: false}
  )

  if (!value) {
    throw new Error('Toponyme not found')
  }

  await mongo.touchDocument('bases_locales', value._bal, value._updated)

  return value
}

async function fetchOne(id) {
  return mongo.db.collection('toponymes').findOne({_id: mongo.parseObjectID(id)})
}

async function fetchAll(idBal, codeCommune) {
  return mongo.db.collection('toponymes').find({
    _bal: idBal,
    commune: codeCommune
  }).toArray()
}

async function remove(id) {
  const {value} = await mongo.db.collection('toponymes').findOneAndDelete({
    _id: mongo.parseObjectID(id)
  })

  if (value) {
    const now = new Date()
    await mongo.touchDocument('bases_locales', value._bal, now)
  }
}

module.exports = {
  create,
  createSchema,
  update,
  updateSchema,
  fetchOne,
  fetchAll,
  remove
}
