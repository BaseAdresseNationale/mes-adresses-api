#!/usr/bin/env node
/* eslint no-await-in-loop: off */
require('dotenv').config()
const mongo = require('../lib/util/mongo')
const {calcMetaTilesNumero, calcMetaTilesVoie} = require('../lib/util/tiles')

async function addTilesToVoies() {
  let index = 0
  const limit = 1000
  let bulk = []

  const total = await mongo.db.collection('voies').countDocuments({centroid: null})
  const cursor = mongo.db.collection('voies').find({centroid: null}).project({_id: 1, typeNumerotation: 1, trace: 1})
  console.log('TOTAL :', total)
  for await (const v of cursor) {
    const {centroid, centroidTiles, traceTiles} = await calcMetaTilesVoie(v)
    bulk.push({updateOne: {
      filter: {_id: v._id},
      update: {$set: {centroid, centroidTiles, traceTiles}}
    }})

    index += 1
    if (bulk.length >= limit || index >= total) {
      console.log(index)
      await mongo.db.collection('voies').bulkWrite(bulk)
      bulk = []
    }
  }

  console.log('TOTAL UPDATE', index)
}

async function addTilesToNumeros() {
  let index = 0
  const limit = 10000
  let bulk = []

  const total = await mongo.db.collection('numeros').countDocuments({tiles: null})
  const cursor = mongo.db.collection('numeros').find({tiles: null}).project({_id: 1, positions: 1})
  console.log('TOTAL :', total)
  for await (const n of cursor) {
    const {tiles} = calcMetaTilesNumero(n)
    bulk.push({updateOne: {
      filter: {_id: n._id},
      update: {$set: {tiles}}
    }})

    index += 1
    if (bulk.length >= limit || index >= total) {
      console.log(index)
      await mongo.db.collection('numeros').bulkWrite(bulk)
      bulk = []
    }
  }

  console.log('TOTAL UPDATE', index)
}

async function main() {
  await mongo.connect()
  console.log('START numeros')
  await addTilesToNumeros()
  console.log('Tiles are added to numeros')
  console.log('START voies')
  await addTilesToVoies()
  console.log('Tiles are added to voies')
  await mongo.disconnect()
}

main().catch(error => {
  console.error(error)
  process.exit(1)
}).then(() => {
  process.exit(0)
})
