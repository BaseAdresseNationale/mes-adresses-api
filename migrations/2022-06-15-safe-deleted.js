#!/usr/bin/env node
/* eslint no-await-in-loop: off */
require('dotenv').config()
const mongo = require('../lib/util/mongo')

async function main() {
  await mongo.connect()

  const modifiedBALs = await mongo.db.collection('bases_locales').updateMany(
    {_deleted: {$exists: false}},
    {$set: {_deleted: null}}
  )

  console.log('\nTerminé !\n')
  console.log('************************************\n')
  console.log(` ${modifiedBALs.modifiedCount} BAL ont été modifiées \n`)
  console.log('************************************\n')

  await mongo.disconnect()
  process.exit()
}

main().catch(error => {
  console.log(error)
  process.exit(1)
})
