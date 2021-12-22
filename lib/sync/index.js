const createError = require('http-errors')
const mongo = require('../util/mongo')

async function detectOutdated() {
  await mongo.db.collection('bases_locales').updateMany(
    {
      'sync.status': 'synced',
      $expr: {$gt: ['$_updated', '$sync.currentUpdated']}
    },
    {$set: {'sync.status': 'outdated'}, $unset: {'sync.currentUpdated': 1}}
  )
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

module.exports = {pause, resume, detectOutdated}
