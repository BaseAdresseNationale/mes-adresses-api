#!/usr/bin/env node
require('dotenv').config()
const {groupBy, countBy} = require('lodash')
const mongo = require('../lib/util/mongo')
const {ObjectID} = require('../lib/util/mongo')
const {normalizeString} = require('../lib/populate/extract-csv')

async function formatHameaux(hameaux) {
  const hameauxGroups = groupBy(hameaux, r => normalizeString(r.complement))
  const formattedHameaux = []

  await Promise.all(Object.values(hameauxGroups).map(async hameau => {
    const countedToponymes = countBy(hameau, r => `${r.complement}__${r.commune}`)
    const [sortedToponymes] = Object.entries(countedToponymes).sort((a, b) => b[1] - a[1])
    const voie = hameau.map(({_id}) => mongo.parseObjectID(_id))

    const numerosRows = await mongo.db.collection('numeros').find({voie: {$in: voie}}).toArray()
    const [nomToponyme, commune] = sortedToponymes[0].split('__')

    if (numerosRows.length > 0) {
      return formattedHameaux.push({
        nomToponyme,
        numerosRows,
        commune,
        _bal: numerosRows[0]._bal,
        _created: numerosRows[0]._created,
        _updated: numerosRows[0]._updated
      })
    }
  }))

  return formattedHameaux
}

async function insertManyLieuxDits(toponymes) {
  const lieuxDits = toponymes.map(({nom, positions, commune, _bal, _created, _updated}) => {
    return {
      _id: new ObjectID(),
      nom,
      _bal,
      commune,
      positions,
      _created,
      _updated
    }
  })

  await mongo.db.collection('toponymes').insertMany(lieuxDits)
  return lieuxDits
}

async function insertManyHameaux(voies) {
  const formattedHameaux = await formatHameaux(voies)

  await Promise.all(formattedHameaux.map(async ({nomToponyme, numerosRows, commune, _bal, _created, _updated}) => {
    const idToponyme = new ObjectID()

    const toponyme = await mongo.db.collection('toponymes').findOne({
      nom: {$regex: nomToponyme, $options: 'i'},
      _bal,
      commune
    })

    await mongo.db.collection('toponymes').insertOne({
      _id: idToponyme,
      nom: nomToponyme,
      _bal,
      commune,
      positions: toponyme ? toponyme.positions : [],
      _created,
      _updated
    })

    if (toponyme) {
      await mongo.db.collection('toponymes').deleteOne({_id: toponyme._id})
    }

    await Promise.all(numerosRows.map(async ({_id}) => {
      await mongo.db.collection('numeros').findOneAndUpdate(
        {_id},
        {$set: {toponyme: idToponyme}}
      )
    }))
  }))
}

async function migrateToponymes() {
  const toponymes = await mongo.db.collection('voies').find({positions: {$ne: []}}).toArray()
  const voieComplements = await mongo.db.collection('voies').find({complement: {$ne: null}, positions: {$eq: []}}).toArray()

  if (toponymes.length > 0) {
    await insertManyLieuxDits(toponymes)
    await mongo.db.collection('voies').deleteMany({
      _id: {
        $in: toponymes.map(({_id}) => _id)
      }
    })
  }

  if (voieComplements.length > 0) {
    await insertManyHameaux(voieComplements)
  }

  await mongo.db.collection('voies').updateMany({},
    {$unset: {complement: '', positions: ''}}
  )
}

async function main() {
  await mongo.connect()
  await migrateToponymes()
  await mongo.disconnect()
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})

module.exports = {migrateToponymes, insertManyLieuxDits, insertManyHameaux}
