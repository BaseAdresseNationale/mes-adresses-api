#!/usr/bin/env node
/* eslint no-await-in-loop: off */
require('dotenv').config()
const mongo = require('../lib/util/mongo')

async function main() {
  await mongo.connect()

  await mongo.db.collection('numeros').updateMany({}, {$set: {parcelles: []}})
  await mongo.db.collection('toponymes').updateMany({}, {$set: {parcelles: []}})

  await mongo.disconnect()
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
