#!/usr/bin/env node
/* eslint no-await-in-loop: off */
require('dotenv').config()
const mongo = require('../lib/util/mongo')

async function runMigrationOnContext({_bal, commune}) {
  await mongo.db.collection('bases_locales').updateOne({_id: _bal}, {$set: {commune}, $unset: {communes: 1}})
}

async function listContexts() {
  const result = await mongo.db.collection('bases_locales').aggregate([
    {$addFields: {commune: {$first: '$communes'}}}
  ]).toArray()

  return result.map(({_id, commune}) => ({_bal: _id, commune}))
}

async function main() {
  await mongo.connect()

  await mongo.db.collection('bases_locales').deleteMany({communes: {$eq: []}})

  const contexts = await listContexts()

  for (const context of contexts) {
    await runMigrationOnContext(context)
  }

  await mongo.disconnect()
}

main().catch(error => {
  console.log(error)
  process.exit(1)
})
