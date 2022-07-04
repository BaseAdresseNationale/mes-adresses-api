const subMonths = require('date-fns/subMonths')
const mongo = require('../util/mongo')

async function removeSoftDeletedBALs() {
  const now = new Date()
  const deleteTime = subMonths(now, 12)

  const softDeletedBALs = await mongo.db.collection('bases_locales').deleteMany({
    _deleted: {$lt: deleteTime}
  })

  console.log(`\n${softDeletedBALs.deletedCount} BALs supprimées définitivement\n`)
}

module.exports = {removeSoftDeletedBALs}
