#!/usr/bin/env node

require('dotenv').config()
const {sub} = require('date-fns')
const mongo = require('../lib/util/mongo')
const {setMongoCache} = require('../lib/services/mongo-cache')

async function main() {
  await mongo.connect()

  const initCacheTs = sub(new Date(), {hours: 1})
  await setMongoCache('detectConflictPublishedSince', initCacheTs)

  await mongo.disconnect()
  process.exit()
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
