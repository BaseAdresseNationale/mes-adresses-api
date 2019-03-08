const Joi = require('joi')
const {omit} = require('lodash')
const {generateBase62String} = require('../util/base62')
const {getFilteredPayload} = require('../util/payload')
const mongo = require('../util/mongo')

const createSchema = Joi.object().keys({
  nom: Joi.string().max(200),
  description: Joi.string().max(2000),
  emails: Joi.array().min(1).items(
    Joi.string().email()
  ).required()
})

async function create(payload) {
  const baseLocale = getFilteredPayload(payload, createSchema)
  Joi.assert(baseLocale, createSchema)

  baseLocale.token = generateBase62String(20)

  mongo.decorateCreation(baseLocale)

  const {insertedId} = await mongo.db.collection('bases_locales').insertOne(baseLocale)
  baseLocale._id = insertedId
  return baseLocale
}

const updateSchema = Joi.object().keys({
  nom: Joi.string().max(200),
  description: Joi.string().max(2000),
  emails: Joi.array().min(1).items(
    Joi.string().email()
  )
})

async function update(id, payload) {
  const baseLocaleChanges = getFilteredPayload(payload, updateSchema)
  Joi.assert(baseLocaleChanges, updateSchema)

  mongo.decorateModification(baseLocaleChanges)

  const {value} = await mongo.db.collection('bases_locales').findOneAndUpdate(
    {_id: mongo.parseObjectID(id)},
    {$set: baseLocaleChanges},
    {returnOriginal: false}
  )

  if (!value) {
    throw new Error('BaseLocale not found')
  }

  return value
}

async function fetchOne(id) {
  return mongo.db.collection('bases_locales').findOne({_id: mongo.parseObjectID(id)})
}

async function fetchAll() {
  return mongo.db.collection('bases_locales').find({}).toArray()
}

async function remove(id) {
  await mongo.db.collection('bases_locales').deleteOne({_id: mongo.parseObjectID(id)})
  // The following instructions could be defered
  await Promise.all([
    mongo.db.collection('voies').deleteMany({_bal: mongo.parseObjectID(id)}),
    mongo.db.collection('numeros').deleteMany({_bal: mongo.parseObjectID(id)})
  ])
}

async function renewToken(id) {
  const {value} = await mongo.db.collection('bases_locales').findOneAndUpdate(
    {_id: mongo.parseObjectID(id)},
    {$set: {token: generateBase62String(20)}},
    {returnOriginal: false}
  )

  if (!value) {
    throw new Error('BaseLocale not found')
  }

  return value
}

function filterSensitiveFields(baseLocale) {
  return omit(baseLocale, 'token', 'emails')
}

module.exports = {
  create,
  createSchema,
  update,
  updateSchema,
  fetchOne,
  fetchAll,
  remove,
  renewToken,
  filterSensitiveFields
}
