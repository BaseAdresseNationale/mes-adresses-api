#! /usr/bin/env node
/* eslint no-await-in-loop: off */
require('dotenv').config()
const mongo = require('./lib/util/mongo')

const now = new Date()
const deleteTime = new Date()
let counter = 0

deleteTime.setMonth(now.getMonth() - 3)

async function main() {
  await mongo.connect()

  const softDeletedBALs = await mongo.db.collection('bases_locales').find({
    _deleted: {$ne: null}
  })

  while (await softDeletedBALs.hasNext()) {
    const baseLocale = await softDeletedBALs.next()

    if (baseLocale._deleted < deleteTime) {
      await mongo.db.collection('bases_locales').deleteOne({
        _id: baseLocale._id
      })

      counter += 1
    }
  }

  console.log(`\n${counter} BALs supprimées définitivement\n`)

  await mongo.disconnect()
  process.exit(1)
}

main().catch(error => {
  console.log(error)
  process.exit(1)
})
