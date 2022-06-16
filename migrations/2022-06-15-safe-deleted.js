#!/usr/bin/env node
/* eslint no-await-in-loop: off */
require('dotenv').config()
const mongo = require('../lib/util/mongo')

async function main() {
  await mongo.connect()

  let counter = 0

  const balCursor = await mongo.db.collection('bases_locales').find({_deleted: {$exists: false}})

  while (await balCursor.hasNext()) {
    const baseLocale = await balCursor.next()

    await mongo.db.collection('bases_locales').updateOne(
      {_id: baseLocale._id},
      {$set: {_deleted: null}}
    )

    counter += 1
  }

  console.log('\nTerminé !\n')
  console.log('****************************\n')
  console.log(` ${counter} BAL ont été modifiées \n`)
  console.log('****************************\n')

  await mongo.disconnect()
  process.exit(1)
}

main().catch(error => {
  console.log(error)
  process.exit(1)
})
