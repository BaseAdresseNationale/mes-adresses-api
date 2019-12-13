const communes = require('@etalab/decoupage-administratif/data/communes.json')
const Joi = require('joi')
const {omit, uniqBy, difference} = require('lodash')
const {generateBase62String} = require('../util/base62')
const {validPayload} = require('../util/payload')
const mongo = require('../util/mongo')
const {sendMail} = require('../util/sendmail')
const createTokenRenewalNotificationEmail = require('../emails/token-renewal-notification')
const createBalCreationNotificationEmail = require('../emails/bal-creation-notification')
const createNewAdminNotificationEmail = require('../emails/new-admin-notification')
const {extract} = require('../populate/extract-ban')
const {extractFromCsv} = require('../populate/extract-csv')
const adressesToCsv = require('../export/csv-bal').exportAsCsv
const {transformToGeoJSON} = require('../export/geojson')
const Voie = require('./voie')
const Numero = require('./numero')

const createSchema = Joi.object().keys({
  nom: Joi.string().max(200).allow(null),
  description: Joi.string().max(2000).allow(null),
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
  baseLocale.status = 'draft'

  mongo.decorateCreation(baseLocale)

  const {insertedId} = await mongo.db.collection('bases_locales').insertOne(baseLocale)
  baseLocale._id = insertedId

  const email = createBalCreationNotificationEmail({baseLocale})
  await sendMail(email, baseLocale.emails)

  return baseLocale
}

const updateSchema = Joi.object().keys({
  nom: Joi.string().max(200).allow(null),
  description: Joi.string().max(2000).allow(null),
  status: Joi.string().valid(['draft', 'ready-to-publish']),
  emails: Joi.array().min(1).items(
    Joi.string().email()
  )
})

async function update(id, payload) {
  // Validate and decorate changes
  const baseLocaleChanges = validPayload(payload, updateSchema)
  mongo.decorateModification(baseLocaleChanges)

  // Fetch current BaseLocale
  const currentBaseLocale = await mongo.db.collection('bases_locales').findOne({_id: mongo.parseObjectID(id)})

  if (!currentBaseLocale) {
    throw new Error('BaseLocale not found')
  }

  // Apply changes to current BaseLocale and return modified one
  const {value} = await mongo.db.collection('bases_locales').findOneAndUpdate(
    {_id: mongo.parseObjectID(id)},
    {$set: baseLocaleChanges},
    {returnOriginal: false}
  )

  // If emails fields is overrided, we compare with current array to send a notification to new email addresses
  if (baseLocaleChanges.emails) {
    const newCollaborators = difference(baseLocaleChanges.emails, currentBaseLocale.emails)
    const notification = createNewAdminNotificationEmail({baseLocale: value})
    await Promise.all(newCollaborators.map(collaborator => sendMail(notification, [collaborator])))
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
  await cleanContent(id)
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

  const email = createTokenRenewalNotificationEmail({baseLocale: value})
  await sendMail(email, value.emails)

  return value
}

async function addCommune(id, codeCommune) {
  if (!communes.some(c => c.code === codeCommune && ['commune-actuelle', 'arrondissement-municipal'].includes(c.type))) {
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

  await cleanContent(id, {commune: codeCommune})

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

  await cleanContent(id, {commune: codeCommune})

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

async function cleanContent(id, query = {}) {
  await Promise.all([
    mongo.db.collection('voies').deleteMany({...query, _bal: mongo.parseObjectID(id)}),
    mongo.db.collection('numeros').deleteMany({...query, _bal: mongo.parseObjectID(id)})
  ])
}

async function exportAsCsv(id) {
  const voies = await mongo.db.collection('voies').find({_bal: mongo.parseObjectID(id)}).toArray()
  const numeros = await mongo.db.collection('numeros').find({_bal: mongo.parseObjectID(id)}).toArray()
  return adressesToCsv({voies, numeros})
}

async function streamToGeoJSON(id, codeCommune) {
  const voiesCursor = mongo.db.collection('voies').find({_bal: id, commune: codeCommune})
  const numerosCursor = mongo.db.collection('numeros').find({_bal: id, commune: codeCommune, 'positions.point': {$exists: true}})
  return transformToGeoJSON({voiesCursor, numerosCursor})
}

async function importFile(id, file) {
  const {voies, numeros, isValid, accepted, rejected} = await extractFromCsv(file)

  if (!isValid) {
    return {isValid: false}
  }

  // Clean all actual voies and numeros
  await cleanContent(id)

  // Set communes
  const communes = uniqBy(voies, v => v.commune).map(v => v.commune)
  await mongo.db.collection('bases_locales').updateOne(
    {_id: mongo.parseObjectID(id)},
    {$set: {communes}}
  )

  // Import new voies and numeros
  await Promise.all([
    Voie.importMany(mongo.parseObjectID(id), voies, {validate: false, keepIds: true}),
    Numero.importMany(mongo.parseObjectID(id), numeros, {validate: false})
  ])

  await mongo.touchDocument('bases_locales', id)

  return {
    isValid: true,
    accepted,
    rejected,
    communes,
    voies: voies.length,
    numeros: numeros.length
  }
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
  streamToGeoJSON,
  cleanContent,
  importFile,
  filterSensitiveFields
}
