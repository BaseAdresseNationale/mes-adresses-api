const createError = require('http-errors')
const hasha = require('hasha')
const {keyBy} = require('lodash')
const {sub} = require('date-fns')
const mongo = require('../util/mongo')
const {sendMail} = require('../util/sendmail')
const createPublicationNotificationEmail = require('../emails/bal-publication-notification')
const BaseLocale = require('../models/base-locale')
const {fetchHabilitation} = require('../habilitations')
const {getCurrentRevision, publishNewRevision, getCurrentRevisions} = require('./api-depot')

async function detectOutdated() {
  await mongo.db.collection('bases_locales').updateMany(
    {
      'sync.status': 'synced',
      $expr: {$gt: ['$_updated', '$sync.currentUpdated']}
    },
    {$set: {'sync.status': 'outdated'}, $unset: {'sync.currentUpdated': 1}}
  )
}

async function applyAndReturnSync(baseLocale, syncChanges) {
  const changes = {
    sync: {
      ...baseLocale.sync,
      ...syncChanges
    }
  }

  if (syncChanges.status === 'conflict') {
    changes.status = 'replaced'
  }

  await mongo.db.collection('bases_locales').updateOne(
    {_id: baseLocale._id},
    {$set: changes}
  )
  return changes.sync
}

async function updateSyncInfo(balId) {
  const baseLocale = await BaseLocale.fetchOne(balId)

  if (baseLocale.status !== 'published') {
    return baseLocale.sync
  }

  if (!baseLocale.sync || !['synced', 'outdated'].includes(baseLocale.sync.status)) {
    throw createError(412, 'Le statut de synchronisation doit être "synced" ou "outdated"')
  }

  const [codeCommune] = baseLocale.communes

  const currentRevision = await getCurrentRevision(codeCommune)

  if (currentRevision._id !== baseLocale.sync.lastUploadedRevisionId) {
    return applyAndReturnSync(baseLocale, {
      status: 'conflict',
      isPaused: true
    })
  }

  if (baseLocale._updated === baseLocale.sync.currentUpdated) {
    if (baseLocale.sync.status === 'synced') {
      return baseLocale.sync
    }

    return applyAndReturnSync(baseLocale, {
      status: 'synced'
    })
  }

  if (baseLocale.sync.status === 'outdated') {
    return baseLocale.sync
  }

  return applyAndReturnSync(baseLocale, {
    status: 'outdated'
  })
}

async function markAsSynced(baseLocale, lastUploadedRevisionId) {
  const sync = {
    status: 'synced',
    isPaused: false,
    currentUpdated: baseLocale._updated,
    lastUploadedRevisionId
  }

  const {value} = await mongo.db.collection('bases_locales').findOneAndUpdate(
    {_id: baseLocale._id},
    {$set: {status: 'published', sync}},
    {returnDocument: 'after'}
  )

  return value
}

async function exec(balId, options = {}) {
  const baseLocale = await BaseLocale.fetchOne(balId)

  /* On commence par vérifier que la publication/synchronisation est possible */

  if (baseLocale.status === 'demo' || baseLocale.status === 'draft') {
    throw createError(412, 'La synchronisation pas possibles pour les Bases Adresses Locales de démo ou en mode brouillon')
  }

  if (baseLocale.communes.length !== 1) {
    throw createError(412, 'La synchronisation n’est possible que pour les Bases Adresses Locales communales')
  }

  const [codeCommune] = baseLocale.communes

  if (!baseLocale._habilitation) {
    throw createError(412, 'Aucune habilitation rattachée à cette Base Adresse Locale')
  }

  const habilitation = await fetchHabilitation(baseLocale._habilitation)

  if (habilitation.status !== 'accepted') {
    throw createError(412, 'L’habilitation rattachée n’est pas une habilitation valide')
  }

  const expiresAt = new Date(habilitation.expiresAt)

  if (expiresAt < new Date()) {
    throw createError(412, 'L’habilitation rattachée a expiré')
  }

  /* On traite ensuite le cas de la première publication (status=ready-to-publish) */

  if (baseLocale.status === 'ready-to-publish') {
    const file = await BaseLocale.exportAsCsv(balId)
    const publishedRevision = await publishNewRevision(codeCommune, baseLocale._id, file, baseLocale._habilitation)

    const email = createPublicationNotificationEmail({baseLocale})
    await sendMail(email, baseLocale.emails)

    return markAsSynced(baseLocale, publishedRevision._id)
  }

  const sync = await updateSyncInfo(balId)

  if ((sync.status === 'conflict' && options.force) || sync.status === 'outdated') {
    const file = await BaseLocale.exportAsCsv(balId)
    const hash = hasha(file, {algorithm: 'sha256'})
    const currentRevision = await getCurrentRevision(codeCommune)
    const currentRevisionBalFile = currentRevision.files.find(f => f.type === 'bal')

    if (currentRevisionBalFile.hash !== hash) {
      const publishedRevision = await publishNewRevision(codeCommune, baseLocale._id, file, baseLocale._habilitation)
      return markAsSynced(baseLocale, publishedRevision._id)
    }

    return markAsSynced(baseLocale, sync.lastUploadedRevisionId)
  }

  return BaseLocale.fetchOne(balId)
}

async function setIsPaused(balId, isPaused) {
  const {value} = await mongo.db.collection('bases_locales').findOneAndUpdate(
    {_id: balId, 'sync.status': {$in: ['synced', 'outdated']}},
    {$set: {'sync.isPaused': isPaused}},
    {returnDocument: 'after'}
  )

  if (!value) {
    throw createError(412, 'Le statut de synchronisation doit être actif pour modifier l’état de pause')
  }

  return value.sync
}

async function pause(balId) {
  return setIsPaused(balId, true)
}

async function resume(balId) {
  return setIsPaused(balId, false)
}

async function markAsReplaced(balId) {
  await mongo.db.collection('bases_locales').updateOne(
    {_id: balId, status: 'published'},
    {
      $set: {
        status: 'replaced',
        'sync.isPaused': true,
        'sync.status': 'conflict'
      }
    }
  )
}

let detectConflictPublishedSince = new Date('2000-01-01')

async function detectConflict() {
  const futurePublishedSince = new Date()

  const currentRevisions = await getCurrentRevisions(detectConflictPublishedSince)
  const revisionsIndex = keyBy(currentRevisions, 'codeCommune')
  const basesLocales = await mongo.db.collection('bases_locales').find({status: 'published'}).toArray()

  await Promise.all(basesLocales.map(async baseLocale => {
    const codeCommune = baseLocale.communes[0]
    const currentRevision = revisionsIndex[codeCommune]

    if (currentRevision && currentRevision._id !== baseLocale.sync.lastUploadedRevisionId) {
      await markAsReplaced(baseLocale._id)
    }
  }))

  detectConflictPublishedSince = futurePublishedSince
}

async function syncOutdated() {
  const timeLimit = sub(new Date(), {hours: 2})

  const idsToSync = await mongo.db
    .collection('bases_locales')
    .distinct('_id', {'sync.status': 'outdated', _updated: {$lt: timeLimit}})

  for (const balId of idsToSync) {
    /* eslint-disable-next-line no-await-in-loop */
    await exec(balId)
  }
}

module.exports = {exec, pause, resume, detectOutdated, detectConflict, syncOutdated}
