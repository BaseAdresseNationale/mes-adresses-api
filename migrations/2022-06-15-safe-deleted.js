#!/usr/bin/env node
/* eslint no-await-in-loop: off */
require('dotenv').config()
const mongo = require('../lib/util/mongo')

async function main() {
  await mongo.connect()

  let counterBal = 0
  let counterNum = 0
  let counterTopo = 0
  let counterVoie = 0

  const balCursor = await mongo.db.collection('bases_locales').find({_deleted: {$exists: false}})
  const numerosCursor = await mongo.db.collection('numeros').find({_deleted: {$exists: false}})
  const toponymesCursor = await mongo.db.collection('toponymes').find({_deleted: {$exists: false}})
  const voiesCursor = await mongo.db.collection('voies').find({_deleted: {$exists: false}})

  while (await balCursor.hasNext()) {
    const baseLocale = await balCursor.next()

    await mongo.db.collection('bases_locales').updateOne(
      {_id: baseLocale._id},
      {$set: {_deleted: null}}
    )

    counterBal += 1
  }

  while (await numerosCursor.hasNext()) {
    const numero = await numerosCursor.next()

    await mongo.db.collection('numeros').updateOne(
      {_id: numero._id},
      {$set: {_deleted: null}}
    )

    counterNum += 1
  }

  while (await toponymesCursor.hasNext()) {
    const toponyme = await toponymesCursor.next()

    await mongo.db.collection('toponymes').updateOne(
      {_id: toponyme._id},
      {$set: {_deleted: null}}
    )

    counterTopo += 1
  }

  while (await voiesCursor.hasNext()) {
    const voie = await voiesCursor.next()

    await mongo.db.collection('voies').updateOne(
      {_id: voie._id},
      {$set: {_deleted: null}}
    )

    counterVoie += 1
  }

  console.log('\nTerminé !\n')
  console.log('************************************\n')
  console.log(` ${counterBal} BAL ont été modifiées \n`)
  console.log(` ${counterNum} numéros ont été modifiés \n`)
  console.log(` ${counterTopo} toponymes ont été modifiés \n`)
  console.log(` ${counterVoie} voies ont été modifiées \n`)
  console.log('************************************\n')

  await mongo.disconnect()
  process.exit(1)
}

main().catch(error => {
  console.log(error)
  process.exit(1)
})
