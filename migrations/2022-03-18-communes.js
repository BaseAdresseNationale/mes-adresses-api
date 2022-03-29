#!/usr/bin/env node

require('dotenv').config()
const mongo = require('../lib/util/mongo')

async function main() {
  await mongo.connect()

  await mongo.db.collection('bases_locales').deleteMany({communes: {$eq: []}})

  await mongo.db.collection('bases_locales').updateMany(
    {},
    [
      {$set: {commune: {$first: '$communes'}}},
      {$unset: ['communes']}
    ]
  )

  await mongo.disconnect()
}

main().catch(error => {
  console.log(error)
  process.exit(1)
})
