const Joi = require('joi')
const {omit, difference, uniq, keyBy} = require('lodash')
const {generateBase62String} = require('../util/base62')
const {validPayload} = require('../util/payload')
const mongo = require('../util/mongo')
const {sendMail} = require('../util/sendmail')
const {getContourCommune} = require('../util/contours-communes')
const createTokenRenewalNotificationEmail = require('../emails/token-renewal-notification')
const createBalCreationNotificationEmail = require('../emails/bal-creation-notification')
const createNewAdminNotificationEmail = require('../emails/new-admin-notification')
const createRecoveryNotificationEmail = require('../emails/recovery-notification')
const {extract} = require('../populate/extract-ban')
const {extractFromCsv} = require('../populate/extract-csv')
const adressesToCsv = require('../export/csv-bal').exportAsCsv
const {transformToGeoJSON} = require('../export/geojson')
const {getCommune: getCommuneCOG, getCodesCommunes} = require('../util/cog')
const {getCommunesSummary} = require('../util/api-ban')
const Voie = require('./voie')
const Numero = require('./numero')
const Toponyme = require('./toponyme')

const nomValidation = Joi.string()
  .min(1).message('Le nom est trop court (1 caractère minimum)')
  .max(200).message('Le nom est trop long (200 caractères maximum)')
const emailsValidation = Joi.array().min(1).items(Joi.string().email())

const createSchema = Joi.object().keys({
  nom: nomValidation.required(),
  emails: emailsValidation.required(),
  commune: Joi.string()
    .valid(...getCodesCommunes())
    .required()
    .messages({'any.only': 'Code commune inconnu'})
})

async function create(payload) {
  const {nom, emails, commune} = validPayload(payload, createSchema)

  const baseLocale = {
    _id: new mongo.ObjectId(),
    nom,
    emails,
    commune,
    token: generateBase62String(20),
    status: 'draft'
  }

  mongo.decorateCreation(baseLocale)

  await mongo.db.collection('bases_locales').insertOne(baseLocale)

  const email = createBalCreationNotificationEmail({baseLocale})
  await sendMail(email, baseLocale.emails)

  return baseLocale
}

const createDemoSchema = Joi.object().keys({
  commune: Joi.string()
    .valid(...getCodesCommunes())
    .required()
    .messages({'any.only': 'Code commune inconnu'}),
  populate: Joi.boolean().required()
})

async function createDemo(payload) {
  const {commune, populate} = validPayload(payload, createDemoSchema)
  const date = new Date()

  const baseLocale = {
    _id: new mongo.ObjectId(),
    token: generateBase62String(20),
    commune,
    nom: `Adresses de ${getCommuneCOG(commune).nom} [démo]`,
    status: 'demo',
    _created: date,
    _updated: date
  }

  await mongo.db.collection('bases_locales').insertOne(baseLocale)

  if (populate) {
    await populateCommune(baseLocale._id, commune)
  }

  return baseLocale
}

const updateSchema = Joi.object().keys({
  nom: nomValidation,
  status: Joi.string().valid('draft', 'ready-to-publish'),
  emails: emailsValidation
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

  if (['published', 'replaced'].includes(currentBaseLocale.status) && baseLocaleChanges.status && baseLocaleChanges.status !== currentBaseLocale.status) {
    throw new Error('La base locale a été publiée, son statut ne peut plus être changé')
  }

  // Apply changes to current BaseLocale and return modified one
  const {value} = await mongo.db.collection('bases_locales').findOneAndUpdate(
    {_id: mongo.parseObjectID(id)},
    {$set: baseLocaleChanges},
    {returnDocument: 'after'}
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

  if (currentBaseLocale.status !== 'demo') {
    throw new Error(`Cannot transform BaseLocale into draft. Expected status demo. Found: ${currentBaseLocale.status}`)
  }

  const {nom, email} = validPayload(payload, transformToDraftSchema)

  const changes = {
    nom: nom ? nom : `Adresses de ${getCommuneCOG(currentBaseLocale.commune).nom}`,
    status: 'draft',
    emails: [email],
    _deleted: null
  }

  mongo.decorateModification(changes)

  const {value: baseLocale} = await mongo.db.collection('bases_locales').findOneAndUpdate(
    {_id: mongo.parseObjectID(currentBaseLocale._id)},
    {$set: changes},
    {returnDocument: 'after'}
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
  return mongo.db.collection('bases_locales').find({commune: {$in: codesCommunes}}).toArray()
}

async function remove(id) {
  const date = new Date()
  const baseLocale = await fetchOne(id)

  if (baseLocale.status === 'demo') {
    mongo.db.collection('bases_locales').deleteOne({_id: mongo.parseObjectID(id)})
    await cleanContent(id)
  } else {
    return mongo.db.collection('bases_locales').findOneAndUpdate(
      {_id: mongo.parseObjectID(id)},
      {$set: {_deleted: date, _updated: date}}
    )
  }
}

async function renewToken(id) {
  const {value} = await mongo.db.collection('bases_locales').findOneAndUpdate(
    {_id: mongo.parseObjectID(id)},
    {$set: {token: generateBase62String(20)}},
    {returnDocument: 'after'}
  )

  if (!value) {
    throw new Error('BaseLocale not found')
  }

  const email = createTokenRenewalNotificationEmail({baseLocale: value})
  await sendMail(email, value.emails)

  return value
}

async function cleanCommune(id) {
  const baseLocale = await mongo.db.collection('bases_locales').findOne({_id: id})

  if (!baseLocale) {
    throw new Error('Base locale non trouvée')
  }

  await cleanContent(id)

  return baseLocale
}

async function populateCommune(id) {
  const baseLocale = await mongo.db.collection('bases_locales').findOne({_id: mongo.parseObjectID(id)})

  if (!baseLocale) {
    throw new Error('Base locale non trouvée')
  }

  await cleanCommune(id)
  const {numeros, voies, toponymes} = await extract(baseLocale.commune)
  await Promise.all([
    Voie.importMany(mongo.parseObjectID(id), voies, {validate: false, keepIds: true}),
    Numero.importMany(mongo.parseObjectID(id), numeros, {validate: false}),
    Toponyme.importMany(mongo.parseObjectID(id), toponymes, {validate: false, keepIds: true})
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
  const toponymes = await mongo.db.collection('toponymes').find({_bal: mongo.parseObjectID(id)}).toArray()
  const numeros = await mongo.db.collection('numeros').find({_bal: mongo.parseObjectID(id)}).toArray()
  return adressesToCsv({voies, toponymes, numeros})
}

async function streamToGeoJSON(id) {
  const voiesCursor = mongo.db.collection('voies').find({_bal: id})
  const numerosCursor = mongo.db.collection('numeros').find({_bal: id, 'positions.point': {$exists: true}})
  const toponymesCursor = mongo.db.collection('toponymes').find({_bal: id})
  return transformToGeoJSON({voiesCursor, numerosCursor, toponymesCursor})
}

async function importFile(baseLocale, file) {
  const {voies, numeros, toponymes, isValid, accepted, rejected} = await extractFromCsv(file, baseLocale.commune)

  if (!isValid) {
    return {isValid: false}
  }

  // Clean all actual voies and numeros
  await cleanContent(baseLocale._id)

  // Import new voies and numeros
  await Promise.all([
    Voie.importMany(mongo.parseObjectID(baseLocale._id), voies, {validate: false, keepIds: true}),
    Numero.importMany(mongo.parseObjectID(baseLocale._id), numeros, {validate: false}),
    Toponyme.importMany(mongo.parseObjectID(baseLocale._id), toponymes, {validate: false, keepIds: true})
  ])

  await mongo.touchDocument('bases_locales', baseLocale._id)

  return {
    isValid: true,
    accepted,
    rejected,
    commune: baseLocale.commune,
    voies: voies.length,
    numeros: numeros.length
  }
}

function filterSensitiveFields(baseLocale) {
  return omit(baseLocale, 'token', 'emails')
}

async function computeStats() {
  const results = await mongo.db.collection('bases_locales').aggregate([
    {$match: {status: {$ne: 'demo'}, _deleted: {$eq: null}}},
    {$group: {
      _id: '$commune',
      basesLocalesIds: {$addToSet: '$_id'},
      statuses: {$addToSet: '$status'}
    }}
  ]).toArray()

  const resultsIndex = keyBy(results, '_id')

  const communesSummary = await getCommunesSummary()

  const publishedCommunes = new Set(
    communesSummary
      .filter(c => c.typeComposition === 'bal')
      .map(c => c.codeCommune)
  )

  const communes = new Set([...publishedCommunes, ...results.map(r => r._id)])

  function getStatus(communeResult) {
    if (communeResult.statuses.includes('published')) {
      return 'published'
    }

    if (communeResult.statuses.includes('replaced')) {
      return 'replaced'
    }

    if (publishedCommunes.has(communeResult._id)) {
      return 'published-other'
    }

    if (communeResult.statuses.includes('ready-to-publish')) {
      return 'ready-to-publish'
    }

    return 'draft'
  }

  return {
    type: 'FeatureCollection',
    features: [...communes]
      .filter(codeCommune => getContourCommune(codeCommune))
      .map(codeCommune => {
        const communeResult = resultsIndex[codeCommune]
        const contourCommune = getContourCommune(codeCommune)
        const {nom, code} = contourCommune.properties
        const maxStatus = communeResult ? getStatus(communeResult) : 'published-other'

        return {
          type: 'Feature',
          properties: {
            code,
            nom,
            maxStatus
          },
          geometry: contourCommune.geometry
        }
      })
  }
}

async function publishedBasesLocalesStats(codesCommunes = null) {
  const basesLocalesQuery = {status: 'published'}

  if (codesCommunes) {
    basesLocalesQuery.commune = {$in: codesCommunes}
  }

  const publishedBasesLocalesIds = await mongo.db.collection('bases_locales')
    .distinct('_id', basesLocalesQuery)

  const nbVoies = await mongo.db.collection('voies').countDocuments({_bal: {$in: publishedBasesLocalesIds}})
  const nbLieuxDits = await mongo.db.collection('toponymes').countDocuments({_bal: {$in: publishedBasesLocalesIds}})
  const nbNumeros = await mongo.db.collection('numeros').countDocuments({_bal: {$in: publishedBasesLocalesIds}})
  const nbNumerosCertifies = await mongo.db.collection('numeros').countDocuments({_bal: {$in: publishedBasesLocalesIds}, certifie: true})

  return {
    nbCommunes: publishedBasesLocalesIds.length,
    nbVoies,
    nbLieuxDits,
    nbNumeros,
    nbNumerosCertifies
  }
}

async function basesLocalesRecovery(userEmail, baseLocaleId) {
  const filters = {emails: userEmail}

  if (baseLocaleId) {
    filters._id = mongo.parseObjectID(baseLocaleId)
  }

  const basesLocales = await mongo.db.collection('bases_locales').find({...filters}).toArray()

  if (basesLocales.length > 0) {
    const email = createRecoveryNotificationEmail({basesLocales})
    await sendMail(email, [userEmail])
  }
}

async function findByCommuneAndEmail(codeCommune, userEmail) {
  const foundBasesLocales = await mongo.db.collection('bases_locales')
    .find({commune: codeCommune, emails: userEmail}).sort({_updated: -1}).toArray()

  return foundBasesLocales.map(bal => filterSensitiveFields(bal))
}

async function getAssignedParcelles(balId) {
  const numeroWithParcelles = await mongo.db.collection('numeros').distinct('parcelles', {_bal: mongo.parseObjectID(balId)})
  const toponymesWithParcelles = await mongo.db.collection('toponymes').distinct('parcelles', {_bal: mongo.parseObjectID(balId)})

  const parcelles = [
    ...numeroWithParcelles,
    ...toponymesWithParcelles
  ]

  return uniq(parcelles)
}

async function getNumerosCount(idBal) {
  const nbNumeros = await mongo.db.collection('numeros').countDocuments({_bal: mongo.parseObjectID(idBal)})
  const nbNumerosCertifies = await mongo.db.collection('numeros').countDocuments({_bal: mongo.parseObjectID(idBal), certifie: true})

  return {nbNumeros, nbNumerosCertifies}
}

async function getExpandedBAL(baseLocale) {
  const {nbNumeros, nbNumerosCertifies} = await getNumerosCount(baseLocale._id)

  baseLocale.nbNumeros = nbNumeros
  baseLocale.nbNumerosCertifies = nbNumerosCertifies

  return baseLocale
}

async function batchUpdateNumeros(idBal, changes) {
  const now = new Date()
  const {certifie} = validPayload(changes, Numero.updateSchema)

  const {modifiedCount} = await mongo.db.collection('numeros').updateMany({
    $and: [
      {_bal: mongo.parseObjectID(idBal)},
      {certifie: {$ne: Boolean(certifie)}}
    ]
  }, {
    $set: {certifie: Boolean(certifie), _updated: now}
  })

  if (modifiedCount > 0) {
    const updatedVoies = await mongo.db.collection('numeros').distinct('voie', {
      _bal: mongo.parseObjectID(idBal),
      certifie: {$eq: certifie},
      _updated: now
    })
    const voieIds = updatedVoies.map(id => mongo.parseObjectID(id))

    await Promise.all([
      mongo.touchDocument('bases_locales', idBal, now),
      mongo.touchDocumentWithManyIds('voies', voieIds, now)
    ])
  }

  return {changes: {certifie}, modifiedCount}
}

async function updateHabilitation(baseLocaleId, habilitationId) {
  await mongo.db.collection('bases_locales').updateOne(
    {_id: mongo.parseObjectID(baseLocaleId)},
    {$set: {_habilitation: habilitationId}}
  )
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
  cleanCommune,
  populateCommune,
  exportAsCsv,
  streamToGeoJSON,
  cleanContent,
  importFile,
  filterSensitiveFields,
  computeStats,
  publishedBasesLocalesStats,
  basesLocalesRecovery,
  findByCommuneAndEmail,
  getAssignedParcelles,
  getNumerosCount,
  getExpandedBAL,
  batchUpdateNumeros,
  updateHabilitation
}
