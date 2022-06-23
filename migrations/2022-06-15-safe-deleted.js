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

  const modifiedNumeros = await mongo.db.collection('numeros').updateMany(
    {_deleted: {$exists: false}},
    {$set: {_deleted: null}}
  )

  const modifiedToponymes = await mongo.db.collection('toponymes').updateMany(
    {_deleted: {$exists: false}},
    {$set: {_deleted: null}}
  )

  const modifiedVoies = await mongo.db.collection('voies').updateMany(
    {_deleted: {$exists: false}},
    {$set: {_deleted: null}}
  )

  console.log('\nTerminé !\n')
  console.log('************************************\n')
  console.log(` ${modifiedBALs.modifiedCount} BAL ont été modifiées \n`)
  console.log(` ${modifiedNumeros.modifiedCount} numéros ont été modifiés \n`)
  console.log(` ${modifiedToponymes.modifiedCount} toponymes ont été modifiés \n`)
  console.log(` ${modifiedVoies.modifiedCount} voies ont été modifiées \n`)
  console.log('************************************\n')

  await mongo.disconnect()
  process.exit(1)
}

main().catch(error => {
  console.log(error)
  process.exit(1)
})
