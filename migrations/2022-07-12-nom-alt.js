#!/usr/bin/env node

require('dotenv').config()
const mongo = require('../lib/util/mongo')

async function main() {
  await mongo.connect()

  const modifiedVoies = await mongo.db.collection('voies').updateMany({nomAlt: {$exists: false}}, {$set: {nomAlt: null}})
  const modifiedToponymes = await mongo.db.collection('toponymes').updateMany({nomAlt: {$exists: false}}, {$set: {nomAlt: null}})

  console.log(`Terminé. ${modifiedVoies.modifiedCount} voies et ${modifiedToponymes.modifiedCount} toponymes modifiés`)

  await mongo.disconnect()
  process.exit()
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
