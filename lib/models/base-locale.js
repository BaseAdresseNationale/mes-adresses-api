const createHttpError = require('http-errors')
const subMonths = require('date-fns/subMonths')
const {omit, difference, uniq, keyBy, union} = require('lodash')
const {generateBase62String} = require('../util/base62')
const {validPayload, addError} = require('../util/payload')
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
const {getCommune: getCommuneCOG} = require('../util/cog')
const {getCommunesSummary} = require('../util/api-ban')
const Voie = require('./voie')
const Numero = require('./numero')
const Toponyme = require('./toponyme')

async function validNom(nom, error) {
  if (nom.length === 0) {
    addError(error, 'nom', 'Le nom est trop court (1 caractère minimum)')
  } else if (nom.length >= 200) {
    addError(error, 'nom', 'Le nom est trop long (200 caractères maximum)')
  }
}

async function validEmail(email, error) {
  if (!(/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[(?:\d{1,3}\.){3}\d{1,3}])|(([a-zA-Z\-\d]+\.)+[a-zA-Z]{2,}))$/.test(email))) {
    addError(error, 'emails', `L’adresse email ${email} est invalide`)
  }
}

async function validEmails(emails, error) {
  if (emails.length === 0) {
    addError(error, 'emails', 'Le champ emails doit contenir au moins une adresse email')
  } else {
    emails.forEach(email => {
      validEmail(email, error)
    })
  }
}

async function validCommune(commune, error) {
  if (!getCommuneCOG(commune)) {
    addError(error, 'commune', 'Code commune inconnu')
  }
}

async function validStatus(status, error) {
  if (!['draft', 'ready-to-publish'].includes(status)) {
    addError(error, 'status', 'La valeur du champ status est incorrecte, seules "draft" et "ready-to-publish" sont autorisées')
  }
}

const createSchema = {
  nom: {valid: validNom, isRequired: true, nullAllowed: false, type: 'string'},
  emails: {valid: validEmails, isRequired: true, nullAllowed: false, type: 'array'},
  commune: {valid: validCommune, isRequired: true, nullAllowed: false, type: 'string'}
}

const createDemoSchema = {
  commune: {valid: validCommune, isRequired: true, nullAllowed: false, type: 'string'},
  populate: {valid: null, isRequired: true, nullAllowed: false, type: 'boolean'}
}

const updateSchema = {
  nom: {valid: validNom, isRequired: false, nullAllowed: false, type: 'string'},
  status: {valid: validStatus, isRequired: false, nullAllowed: false, type: 'string'},
  emails: {valid: validEmails, isRequired: false, nullAllowed: false, type: 'array'}
}

const transformToDraftSchema = {
  nom: {valid: validNom, isRequired: false, nullAllowed: true, type: 'string'},
  email: {valid: validEmail, isRequired: true, nullAllowed: false, type: 'string'}
}

function parseQueryFilters(query) {
  const limit = query.limit ? Number.parseInt(query.limit, 10) : 20
  const offset = query.offset ? Number.parseInt(query.offset, 10) : 0
  const filters = {}

  if (!Number.isInteger(limit) || limit > 100 || limit <= 0) {
    throw createHttpError(400, 'La valeur du champ "limit" doit un entier compris en 1 et 100 (défaut : 20)')
  }

  if (!Number.isInteger(offset) || offset < 0) {
    throw createHttpError(400, 'La valeur du champ "offset" doit être un entier positif (défaut : 0)')
  }

  if (query.deleted) {
    if (query.deleted === '0') {
      filters._deleted = {$eq: null}
    } else if (query.deleted === '1') {
      filters._deleted = {$ne: null}
    } else {
      throw createHttpError(400, 'La valeur du champ "deleted" est invalide')
    }
  }

  if (query.commune) {
    if (typeof query.commune === 'string' && getCommuneCOG(query.commune)) {
      filters.commune = {$eq: query.commune}
    } else {
      throw createHttpError(400, 'La valeur du champ "commune" est invalide')
    }
  }

  if (query.email) {
    if (typeof query.email === 'string' && validEmail(query.email)) {
      filters.emails = {$eq: query.email}
    } else {
      throw createHttpError(400, 'La valeur du champ "email" est invalide')
    }
  }

  if (query.status) {
    if (typeof query.status === 'string' && ['demo', 'draft', 'ready-to-publish', 'published', 'replaced'].includes(query.status)) {
      filters.status = {$eq: query.status}
    } else {
      throw createHttpError(400, 'La valeur du champ "email" est invalide')
    }
  }

  return {offset, limit, filters}
}

async function create(payload) {
  const {nom, emails, commune} = await validPayload(payload, createSchema)

  const baseLocale = {
    _id: new mongo.ObjectId(),
    nom,
    emails,
    commune,
    token: generateBase62String(20),
    status: 'draft'
  }

  mongo.decorateCreation(baseLocale, true)

  await mongo.db.collection('bases_locales').insertOne(baseLocale)

  const email = createBalCreationNotificationEmail({baseLocale})
  await sendMail(email, baseLocale.emails)

  return baseLocale
}

async function createDemo(payload) {
  const {commune, populate} = await validPayload(payload, createDemoSchema)

  const baseLocale = {
    _id: new mongo.ObjectId(),
    token: generateBase62String(20),
    commune,
    nom: `Adresses de ${getCommuneCOG(commune).nom} [démo]`,
    status: 'demo'
  }

  mongo.decorateCreation(baseLocale, true)

  await mongo.db.collection('bases_locales').insertOne(baseLocale)

  if (populate) {
    await populateCommune(baseLocale._id, commune)
  }

  return baseLocale
}

async function update(id, payload) {
  // Validate and decorate changes
  const baseLocaleChanges = await validPayload(payload, updateSchema)
  mongo.decorateModification(baseLocaleChanges)

  // Fetch current BaseLocale
  const currentBaseLocale = await mongo.db.collection('bases_locales').findOne({_id: mongo.parseObjectID(id)})

  if (!currentBaseLocale) {
    throw new Error('BaseLocale not found')
  }

  if (['published', 'replaced'].includes(currentBaseLocale.status) && baseLocaleChanges.status && baseLocaleChanges.status !== currentBaseLocale.status) {
    throw new Error('La base locale a été publiée, son statut ne peut plus être changé')
  }

  const numeroCount = await mongo.db.collection('numeros').countDocuments({_bal: mongo.parseObjectID(id)})
  if (numeroCount === 0 && baseLocaleChanges.status === 'ready-to-publish') {
    throw createHttpError(412, 'La base locale ne possède aucune adresse')
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

async function transformToDraft(currentBaseLocale, payload) {
  if (!currentBaseLocale) {
    throw new Error('A BaseLocale must be provided as first param')
  }

  if (currentBaseLocale.status !== 'demo') {
    throw new Error(`Cannot transform BaseLocale into draft. Expected status demo. Found: ${currentBaseLocale.status}`)
  }

  const {nom, email} = await validPayload(payload, transformToDraftSchema)

  const changes = {
    nom: nom ? nom : `Adresses de ${getCommuneCOG(currentBaseLocale.commune).nom}`,
    status: 'draft',
    emails: [email]
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

async function fetchByQuery(query) {
  const {limit, offset, filters} = parseQueryFilters(query)
  const count = await mongo.db.collection('bases_locales').countDocuments(filters)
  const basesLocales = await mongo.db.collection('bases_locales')
    .find({...filters})
    .limit(limit)
    .skip(offset)
    .toArray()

  return {offset, limit, count, basesLocales}
}

async function fetchByCommunes(codesCommunes) {
  return mongo.db.collection('bases_locales').find({commune: {$in: codesCommunes}, _deleted: {$eq: null}}).toArray()
}

async function remove(id) {
  const now = new Date()
  const baseLocale = await fetchOne(id)

  if (baseLocale.status === 'demo') {
    mongo.db.collection('bases_locales').deleteOne({_id: mongo.parseObjectID(id)})
    await cleanContent(id)
  } else {
    return mongo.db.collection('bases_locales').findOneAndUpdate(
      {_id: mongo.parseObjectID(id)},
      {$set: {_deleted: now, _updated: now}}
    )
  }
}

async function recovery(id) {
  const now = new Date()
  const {value} = await mongo.db.collection('bases_locales').findOneAndUpdate(
    {_id: mongo.parseObjectID(id)},
    {$set: {_deleted: null, _updated: now}},
    {returnDocument: 'after'}
  )

  if (!value) {
    throw new Error('BaseLocale not found')
  }

  return value
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
    mongo.db.collection('toponymes').deleteMany({...query, _bal: mongo.parseObjectID(id)}),
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

async function createBaseLocaleFromCommunesMerge({codeCommune, nom, communesDeleguees, basesLocales, emails}) {
  let unionEmails = emails
  let isReadyToPublish = false

  const balId = new mongo.ObjectId()
  const baseLocale = {
    _id: balId,
    nom,
    emails,
    commune: codeCommune,
    token: generateBase62String(20),
    status: 'draft'
  }

  mongo.decorateCreation(baseLocale, true)

  await mongo.db.collection('bases_locales').insertOne(baseLocale)

  // Populate BAL with communesDeleguees
  if (communesDeleguees?.length > 0) {
    for (const code of communesDeleguees) {
      const {numeros, voies, toponymes} = await extract(code)
      await Promise.all([
        Voie.importMany(balId, voies.map(d => ({...d, commune: codeCommune})), {validate: false, keepIds: true}),
        Numero.importMany(balId, numeros.map(d => ({...d, commune: codeCommune})), {validate: false}),
        Toponyme.importMany(balId, toponymes.map(d => ({...d, commune: codeCommune})), {validate: false, keepIds: true})
      ])
    }
  }

  // Copy voies, toponyme and numeros from other bases locales
  if (basesLocales?.length > 0) {
    for (const bal of basesLocales) {
      // Union all emails
      const _baseLocale = await mongo.db.collection('bases_locales').findOne({_id: mongo.parseObjectID(bal)})
      unionEmails = union(unionEmails, _baseLocale.emails)

      // Get most advanced status
      if (!isReadyToPublish) {
        isReadyToPublish = ['ready-to-publish', 'published'].includes(_baseLocale.status)
      }

      await copyBaseLocale(bal, balId)

      const now = new Date()
      await mongo.db.collection('bases_locales').findOneAndUpdate(
        {_id: mongo.parseObjectID(bal)},
        {$set: {_deleted: now, _updated: now}}
      )
    }
  }

  await mongo.db.collection('bases_locales').updateOne({
    _id: balId
  }, {$set: {
    emails: unionEmails,
    status: isReadyToPublish ? 'ready-to-publish' : 'draft'
  }})

  return {...baseLocale, emails: unionEmails, status: isReadyToPublish ? 'ready-to-publish' : 'draft'}
}

async function copyBaseLocale(from, to) {
  const idsTable = new Map()
  const {commune} = await mongo.db.collection('bases_locales').findOne({_id: to})

  await mongo.db.collection('voies')
    .find({_bal: mongo.parseObjectID(from)})
    .forEach(async voie => {
      const voieCopy = {
        ...voie,
        _id: new mongo.ObjectId(),
        _bal: to,
        commune,
      }
      idsTable.set(voie._id.toHexString(), voieCopy._id.toHexString())

      await mongo.db.collection('voies').insertOne(voieCopy)
    })

  await mongo.db.collection('toponymes')
    .find({_bal: mongo.parseObjectID(from)})
    .forEach(async toponyme => {
      const toponymeCopy = {
        ...toponyme,
        _id: new mongo.ObjectId(),
        _bal: to,
        commune
      }
      idsTable.set(toponyme._id.toHexString(), toponymeCopy._id.toHexString())

      await mongo.db.collection('toponymes').insertOne(toponymeCopy)
    })

  await mongo.db.collection('numeros')
    .find({_bal: mongo.parseObjectID(from)})
    .forEach(async numero => {
      const voie = idsTable.get(numero.voie.toHexString())
      if (!voie) {
        throw new Error(`La voie ${numero.voie} n’a pas été trouvée`)
      }

      let toponyme
      if (numero.toponyme) {
        toponyme = idsTable.get(numero.toponyme.toHexString())
        if (!toponyme) {
          throw new Error(`Le toponyme ${numero.toponyme} n’a pas été trouvée`)
        }
      }

      const numeroCopy = {
        ...numero,
        _id: new mongo.ObjectId(),
        _bal: to,
        voie: new mongo.ObjectId(voie),
        toponyme: toponyme ? new mongo.ObjectId(toponyme) : null,
        commune
      }

      await mongo.db.collection('numeros').insertOne(numeroCopy)
    })
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

async function getAssignedParcelles(balId) {
  const numeroWithParcelles = await mongo.db.collection('numeros').distinct('parcelles', {_bal: mongo.parseObjectID(balId)})
  const toponymesWithParcelles = await mongo.db.collection('toponymes').distinct('parcelles', {_bal: mongo.parseObjectID(balId)})

  const parcelles = [
    ...numeroWithParcelles,
    ...toponymesWithParcelles
  ]

  return uniq(parcelles)
}

async function batchUpdateNumeros(idBal, changes) {
  const now = new Date()
  const {certifie} = await validPayload(changes, Numero.updateSchema)

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

/* eslint no-await-in-loop: off */
async function removeSoftDeletedBALsOlderThanOneYear() {
  const now = new Date()
  const deleteTime = subMonths(now, 12)

  const softDeletedBALsIDs = await mongo.db.collection('bases_locales').distinct('_id',
    {_deleted: {$lt: deleteTime}}
  )

  for (const softDeletedBALsID of softDeletedBALsIDs) {
    await mongo.db.collection('bases_locales').deleteOne({_id: softDeletedBALsID})
    await cleanContent(softDeletedBALsID)
  }

  console.log(`\n${softDeletedBALsIDs.length} BALs supprimées définitivement\n`)
}

async function removeDemoBALsOlderThanAMonth() {
  const now = new Date()
  const creationTime = subMonths(now, 1)

  const demoBALsIDs = await mongo.db.collection('bases_locales').distinct('_id',
    {status: 'demo', _created: {$lt: creationTime}}
  )

  for (const demoBALsID of demoBALsIDs) {
    await cleanContent(demoBALsID)
    await mongo.db.collection('bases_locales').deleteOne({_id: demoBALsID})
  }

  console.log(`\n${demoBALsIDs.length} BALs de démonstration supprimées définitivement\n`)
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
  recovery,
  fetchOne,
  fetchAll,
  fetchByQuery,
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
  createBaseLocaleFromCommunesMerge,
  copyBaseLocale,
  computeStats,
  publishedBasesLocalesStats,
  basesLocalesRecovery,
  getAssignedParcelles,
  batchUpdateNumeros,
  updateHabilitation,
  removeSoftDeletedBALsOlderThanOneYear,
  removeDemoBALsOlderThanAMonth
}
