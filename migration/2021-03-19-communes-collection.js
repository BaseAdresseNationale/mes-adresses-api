#!/usr/bin/env node
/* eslint no-await-in-loop: off */
require('dotenv').config()

const Promise = require('bluebird')
const mongo = require('../lib/util/mongo')

async function migrateCommune() {
  const basesLocales = await mongo.db.collection('bases_locales').find().toArray()
  const basesLocalesWithCommunes = basesLocales.filter(({communes}) => communes)

  if (basesLocalesWithCommunes.length === 0) {
    return
  }

  for (const baseLocale of basesLocalesWithCommunes) {
    const {_id, communes} = baseLocale
    await Promise.all(communes.map(code => mongo.db.collection('communes').insertOne({_bal: _id, code})))
  }

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
