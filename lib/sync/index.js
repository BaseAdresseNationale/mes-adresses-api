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

module.exports = {detectOutdated}
