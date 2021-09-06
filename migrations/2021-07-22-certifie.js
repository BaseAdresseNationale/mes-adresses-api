#!/usr/bin/env node

require('dotenv').config()
const mongo = require('../lib/util/mongo')

async function main() {
  await mongo.connect()

  await mongo.db.collection('numeros').updateMany({certifie: {$exists: false}}, {$set: {certifie: false}})

  await mongo.disconnect()
}

main().catch(error => {
  console.log(error)
  process.exit(1)
})
