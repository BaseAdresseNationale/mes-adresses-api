const communes = require('@etalab/decoupage-administratif/data/communes.json')
const Joi = require('joi')
const {omit} = require('lodash')
const {generateBase62String} = require('../util/base62')
const {validPayload} = require('../util/payload')
const mongo = require('../util/mongo')
const {extract} = require('../populate/extract-ban')
const adressesToCsv = require('../export/csv-bal').exportAsCsv
const Voie = require('./voie')
const Numero = require('./numero')

const createSchema = Joi.object().keys({
  nom: Joi.string().max(200),
  description: Joi.string().max(2000),
  emails: Joi.array().min(1).items(
    Joi.string().email()
  ).required()
})

async function create(payload) {
  const baseLocale = validPayload(payload, createSchema)

  baseLocale.token = generateBase62String(20)
  baseLocale.communes = []
  baseLocale.nom = baseLocale.nom || null
  baseLocale.description = baseLocale.description || null

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
  const baseLocaleChanges = validPayload(payload, updateSchema)

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

async function addCommune(id, codeCommune) {
  if (!communes.some(c => c.code === codeCommune)) {
    throw new Error('Code commune inconnu')
  }

  const {value} = await mongo.db.collection('bases_locales').findOneAndUpdate(
    {_id: mongo.parseObjectID(id)},
    {$addToSet: {communes: codeCommune}},
    {returnOriginal: false}
  )

  if (!value) {
    throw new Error('BaseLocale not found')
  }

  return value
}

async function cleanCommune(id, codeCommune) {
  const baseLocale = await mongo.db.collection('bases_locales').findOne({_id: id})

  if (!baseLocale) {
    throw new Error('Base locale non trouvée')
  }

  if (!baseLocale.communes.includes(codeCommune)) {
    throw new Error('Commune non associée à la base locale')
  }

  // The following instructions could be defered
  await Promise.all([
    mongo.db.collection('voies').deleteMany({_bal: mongo.parseObjectID(id), commune: codeCommune}),
    mongo.db.collection('numeros').deleteMany({_bal: mongo.parseObjectID(id), commune: codeCommune})
  ])

  return baseLocale
}

async function removeCommune(id, codeCommune) {
  if (!communes.some(c => c.code === codeCommune)) {
    throw new Error('Code commune inconnu')
  }

  const {value} = await mongo.db.collection('bases_locales').findOneAndUpdate(
    {_id: mongo.parseObjectID(id)},
    {$pull: {communes: codeCommune}},
    {returnOriginal: false}
  )

  if (!value) {
    throw new Error('BaseLocale not found')
  }

  // The following instructions could be defered
  await Promise.all([
    mongo.db.collection('voies').deleteMany({_bal: mongo.parseObjectID(id), commune: codeCommune}),
    mongo.db.collection('numeros').deleteMany({_bal: mongo.parseObjectID(id), commune: codeCommune})
  ])

  return value
}

async function populateCommune(id, codeCommune) {
  const baseLocale = await mongo.db.collection('bases_locales').findOne({_id: mongo.parseObjectID(id)})

  if (!baseLocale) {
    throw new Error('Base locale non trouvée')
  }

  if (!baseLocale.communes.includes(codeCommune)) {
    throw new Error('Commune non associée à la base locale')
  }

  await cleanCommune(id, codeCommune)
  const {numeros, voies} = await extract(codeCommune)
  await Promise.all([
    Voie.importMany(mongo.parseObjectID(id), voies, {validate: false, keepIds: true}),
    Numero.importMany(mongo.parseObjectID(id), numeros, {validate: false})
  ])

  return baseLocale
}

async function exportAsCsv(id) {
  const voies = await mongo.db.collection('voies').find({_bal: mongo.parseObjectID(id)}).toArray()
  const numeros = await mongo.db.collection('numeros').find({_bal: mongo.parseObjectID(id)}).toArray()
  return adressesToCsv({voies, numeros})
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
  addCommune,
  cleanCommune,
  removeCommune,
  populateCommune,
  exportAsCsv,
  filterSensitiveFields
}
