#!/usr/bin/env node
require('dotenv').config()

const mongo = require('../lib/util/mongo')

async function migrateCommune() {
  const basesLocales = await mongo.db.collection('bases_locales').find().toArray()

  basesLocales.forEach(async ({_id, communes}) => {
    if (communes) {
      await Promise.all(
        communes.map(code => mongo.db.collection('communes').insertOne({_bal: _id, code}))
      )
    }
  })
  await mongo.db.collection('bases_locales').updateMany({}, {$unset: {communes: ''}})
}

async function main() {
  await mongo.connect()
  await migrateCommune()
  await mongo.disconnect()
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})

module.exports = {
  migrateCommune
}
