#!/usr/bin/env node
/* eslint no-await-in-loop: off */
require('dotenv').config()
const {setTimeout} = require('node:timers/promises')
const mongo = require('../lib/util/mongo')

async function main() {
  await mongo.connect()

  const countMultiple = mongo.db.collection('bases_locales').countDocuments({'communes.1': {$exists: true}})

  if (countMultiple > 0) {
    console.error(`Impossible de migrer les données : ${countMultiple} BAL contiennent plus d'une commune`)
    process.exit(1)
  }

  const countEmpty = mongo.db.collection('bases_locales').countDocuments({communes: {size: 0}})

  if (countEmpty > 0) {
    console.log(`${countEmpty} BAL sont vides : elles vont être supprimées dans 10 secondes…`)
    await setTimeout(10000)

    await mongo.db.collection('bases_locales').deleteMany({communes: {size: 0}})
    console.log('Les BAL vides ont été supprimées.')
  }

  const balCursor = mongo.db.collection('bases_locales').find({})

  while (await balCursor.hasNext()) {
    const baseLocale = await balCursor.next()
    const [commune] = baseLocale.communes

    if (commune) {
      await mongo.db.collection('bases_locales').updateOne(
        {_id: baseLocale._id},
        {$set: {commune}, $unset: {communes: 1}}
      )
    } else {
      console.log(`Commune non trouvée pour la BAL : ${baseLocale._id}`)
    }
  }

  console.log('Terminé')

  await mongo.disconnect()
  process.exit(0)
}

main().catch(error => {
  console.log(error)
  process.exit(1)
})
