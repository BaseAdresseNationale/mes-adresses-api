const Joi = require('joi')
const got = require('got')
const {omit, uniqBy, difference} = require('lodash')
const {generateBase62String} = require('../util/base62')
const {validPayload} = require('../util/payload')
const mongo = require('../util/mongo')
const {sendMail} = require('../util/sendmail')
const {getContourCommune} = require('../util/contours-communes')
const createTokenRenewalNotificationEmail = require('../emails/token-renewal-notification')
const createBalCreationNotificationEmail = require('../emails/bal-creation-notification')
const createNewAdminNotificationEmail = require('../emails/new-admin-notification')
const {extract} = require('../populate/extract-ban')
const {extractFromCsv} = require('../populate/extract-csv')
const adressesToCsv = require('../export/csv-bal').exportAsCsv
const {transformToGeoJSON} = require('../export/geojson')
const {getNomCommune, getCodesCommunes} = require('../util/cog')
const Commune = require('./commune')
const Voie = require('./voie')
const Numero = require('./numero')

const createSchema = Joi.object().keys({
  nom: Joi.string().max(200).allow(null),
  emails: Joi.array().min(1).items(
    Joi.string().email()
  ).required(),
  enableComplement: Joi.boolean().default(false)
})

async function create(payload) {
  const {nom, emails, enableComplement} = validPayload(payload, createSchema)

  const baseLocale = {
    nom,
    emails,
    enableComplement,
    token: generateBase62String(20),
    communes: []
  }

  mongo.decorateCreation(baseLocale)

  const {insertedId} = await mongo.db.collection('bases_locales').insertOne(baseLocale)
  baseLocale._id = insertedId

  const email = createBalCreationNotificationEmail({baseLocale})
  await sendMail(email, baseLocale.emails)

  return baseLocale
}

const createDemoSchema = Joi.object().keys({
  commune: Joi.string()
    .valid(...getCodesCommunes())
    .required()
    .error(errors => {
      errors.forEach(err => {
        if (err.code) {
          err.message = 'Code commune inconnu'
        }
      })
      return errors
    }),
  populate: Joi.boolean().required()
})

async function createDemo(payload) {
  const {commune, populate} = validPayload(payload, createDemoSchema)

  const baseLocale = {
    token: generateBase62String(20),
    communes: [commune],
    nom: `Adresses de ${getNomCommune(commune)} [démo]`,
    isDemo: true
  }

  mongo.decorateCreation(baseLocale)

  const {insertedId} = await mongo.db.collection('bases_locales').insertOne(baseLocale)
  baseLocale._id = insertedId

  await Commune.create(baseLocale._id, {code: commune, status: 'demo'})

  if (populate) {
    await populateCommune(baseLocale._id, commune)
  }

  return baseLocale
}

const updateSchema = Joi.object().keys({
  nom: Joi.string().max(200).allow(null),
  emails: Joi.array().min(1).items(
    Joi.string().email()
  ),
  enableComplement: Joi.boolean().default(false)
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

const transformToDraftSchema = Joi.object().keys({
  nom: Joi.string().max(200).allow(null),
  email: Joi.string().email().required()
})

async function transformToDraft(currentBaseLocale, payload) {
  if (!currentBaseLocale) {
    throw new Error('A BaseLocale must be provided as first param')
  }

  if (!currentBaseLocale.isDemo) {
    throw new Error('Cannot transform a baseLocale that is not a demo.')
  }

  const {nom, email} = validPayload(payload, transformToDraftSchema)

  const changes = {
    nom: nom ? nom : `Adresses de ${getNomCommune(currentBaseLocale.communes[0])}`,
    emails: [email],
    isDemo: false
  }

  await mongo.db.collection('communes').updateMany(
    {_bal: mongo.parseObjectID(currentBaseLocale._id)},
    {$set: {status: 'draft'}},
    {returnOriginal: false}
  )

  mongo.decorateModification(changes)

  const {value: baseLocale} = await mongo.db.collection('bases_locales').findOneAndUpdate(
    {_id: mongo.parseObjectID(currentBaseLocale._id)},
    {$set: changes},
    {returnOriginal: false}
  )

  const emailContent = createBalCreationNotificationEmail({baseLocale})
  await sendMail(emailContent, baseLocale.emails)

  return baseLocale
}

async function fetchOne(id) {
  return mongo.db.collection('bases_locales').findOne({_id: mongo.parseObjectID(id)})
}

async function fetchAll() {
  return mongo.db.collection('bases_locales').find({}).toArray()
}

async function fetchByCommunes(codesCommunes) {
  return mongo.db.collection('bases_locales').find({communes: {$elemMatch: {$in: codesCommunes}}}).toArray()
}

async function remove(id) {
  const communes = await mongo.db.collection('communes').find({
    _bal: mongo.parseObjectID(id),
    $or: [{status: 'published'}, {status: 'ready-to-publish'}]
  }).toArray()

  if (communes.length > 0) {
    throw new Error('Impossible de supprimer une Base Locale possèdant ou des communes publiées ou prêtes à être publiées')
  }

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

async function getCommune(idBal, codeCommune) {
  const commune = await mongo.db.collection('communes').findOne({_bal: idBal, code: codeCommune})

  if (!commune) {
    throw new Error('Commune non trouvée')
  }

  return commune
}

async function addCommune(id, codeCommune) {
  const baseLocale = await mongo.db.collection('bases_locales').findOne({_id: id})

  if (!baseLocale) {
    throw new Error('Base locale non trouvée')
  }

  if (baseLocale.communes.includes(codeCommune)) {
    throw new Error('Cette commune existe déjà dans cette base locale')
  }

  const status = baseLocale.isDemo ? 'demo' : 'draft'

  await Commune.create(id, {code: codeCommune, status})

  const {value} = await mongo.db.collection('bases_locales').findOneAndUpdate(
    {_id: mongo.parseObjectID(baseLocale._id)},
    {$addToSet: {communes: codeCommune}},
    {returnOriginal: false}
  )

  return value
}

async function updateCommuneStatus(baseLocale, codeCommune, status) {
  if (baseLocale.isDemo) {
    throw new Error('Impossible de modifier le statut d’une commune d’une Base Locale de démonstration')
  }

  const commune = await mongo.db.collection('communes').findOne({_bal: baseLocale._id, code: codeCommune})
  if (!commune) {
    throw new Error('Commune non trouvée')
  }

  // Status evolution
  // demo -> draft <-> ready-to-publish -> published
  if (commune.status === 'published') {
    throw new Error('Impossible de changer le status d’une Base Locale publiée')
  }

  if (status === 'ready-to-publish' && commune.status !== 'draft') {
    throw new Error('Seule une commune en brouillon peut passer au statut "Prête à être publiée"')
  }

  if (status === 'published' && commune.status !== 'ready-to-publish') {
    throw new Error('Seule une commune prête à être publiée peut être publiée')
  }

  return Commune.update(commune._id, {status})
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
  const commune = await mongo.db.collection('communes').findOne({_bal: id, code: codeCommune})
  if (!commune) {
    throw new Error('Commune non trouvée')
  }

  if (commune.status === 'ready-to-publish') {
    throw new Error('Impossible de supprimer une commune prête à être publiée')
  }

  const {value} = await mongo.db.collection('bases_locales').findOneAndUpdate(
    {_id: mongo.parseObjectID(id)},
    {$pull: {communes: codeCommune}},
    {returnOriginal: false}
  )

  if (!value) {
    throw new Error('BaseLocale not found')
  }

  await mongo.db.collection('communes').deleteOne({code: codeCommune, _bal: mongo.parseObjectID(id)})
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
  await Commune.create(id, {code: codeCommune})
  const {numeros, voies} = await extract(codeCommune)
  await Promise.all([
    Voie.importMany(mongo.parseObjectID(id), voies, {validate: false, keepIds: true}),
    Numero.importMany(mongo.parseObjectID(id), numeros, {validate: false})
  ])

  return baseLocale
}

async function cleanContent(id, query = {}) {
  await Promise.all([
    mongo.db.collection('communes').deleteMany({_bal: mongo.parseObjectID(id)}),
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
    Commune.importMany(mongo.parseObjectID(id), communes, {validate: false, keepIds: true}),
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

async function computeStats() {
  const response = await got('https://backend.adresse.data.gouv.fr/publication/submissions/published', {responseType: 'json'})
  const publishedBasesLocalesIds = new Set(response.body.map(b => b.url.slice(54, 78)))

  const results = await mongo.db.collection('bases_locales').aggregate([
    {$match: {status: {$ne: 'demo'}}},
    {$unwind: '$communes'},
    {$group: {
      _id: '$communes',
      basesLocalesIds: {$addToSet: '$_id'},
      statuses: {$addToSet: '$status'}
    }}
  ]).toArray()

  function getStatus(communeResult) {
    if (communeResult.basesLocalesIds.some(id => publishedBasesLocalesIds.has(id.toString()))) {
      return 'published'
    }

    if (communeResult.statuses.includes('ready-to-publish')) {
      return 'ready-to-publish'
    }

    return 'draft'
  }

  return {
    type: 'FeatureCollection',
    features: results
      .filter(r => getContourCommune(r._id))
      .map(r => {
        const contourCommune = getContourCommune(r._id)
        const {nom, code} = contourCommune.properties
        const properties = {
          code,
          nom,
          maxStatus: getStatus(r)
        }
        return {
          type: 'Feature',
          properties,
          geometry: contourCommune.geometry
        }
      })
  }
}

module.exports = {
  create,
  createSchema,
  createDemo,
  createDemoSchema,
  update,
  updateSchema,
  transformToDraft,
  transformToDraftSchema,
  fetchOne,
  fetchAll,
  fetchByCommunes,
  remove,
  renewToken,
  getCommune,
  addCommune,
  updateCommuneStatus,
  cleanCommune,
  removeCommune,
  populateCommune,
  exportAsCsv,
  streamToGeoJSON,
  cleanContent,
  importFile,
  filterSensitiveFields,
  computeStats
}
