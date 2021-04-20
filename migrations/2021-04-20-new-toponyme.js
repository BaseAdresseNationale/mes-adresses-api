#!/usr/bin/env node
require('dotenv').config()
const {groupBy, uniq, flatten} = require('lodash')
const mongo = require('../lib/util/mongo')
const {ObjectID} = require('../lib/util/mongo')
const {normalizeString} = require('../lib/populate/extract-csv')

// Regroupe les toponymes et complément de voie sous un identifiant unique
async function groupToponymes() {
  // Récupères toutes les voies avec des positions, considéré comme des toponymes
  const toponymes = await mongo.db.collection('voies').find({positions: {$ne: []}}).toArray()
  // Récupères toutes les voies avec un complément, ce complément est considéré comme un toponyme
  const complements = await mongo.db.collection('voies').find({complement: {$ne: null}}).toArray()

  return groupBy([...toponymes, ...complements], v => {
    const nom = normalizeString(v.complement || v.nom)
    return `${v._bal}_${v.commune}_${nom}`
  })
}

async function mergeToponymes(toponymesGroups) {
  return Promise.all(Object.keys(toponymesGroups).map(async key => {
    const voies = toponymesGroups[key]

    // Crée un tableau contenant la liste des id des voies avec le même complément
    const voiesIds = voies.map(({_id}) => mongo.parseObjectID(_id))

    // Récupère tous les numéros des voies ayant le même complément
    const numeros = await mongo.db.collection('numeros').find({voie: {$in: voiesIds}}).toArray()

    // Extrait la BAL, la commune et le complement du groupe
    const {_bal, commune, complement, nom} = voies[0]
    const nomToponyme = complement || nom // Améliorer en récupérer le string avec le plus d'occurence

    return {
      nomToponyme,
      numeros,
      positions: uniq(flatten(voies.map(({positions}) => positions))),
      commune,
      _bal
    }
  }))
}

async function migrateToponymes() {
  // Regroupe toutes les "types" de toponyme
  const toponymesGroups = await groupToponymes()

  // Fusionne tous les toponymes identique
  const mergedtoponymes = await mergeToponymes(toponymesGroups)

  // Attribu un ID aux toponymes et associe leurs numéros
  const toponymes = await Promise.all(mergedtoponymes.map(async t => {
    const {nom, positions, commune, _bal, _created, _updated} = t
    const idToponyme = new ObjectID()

    // Associe les numéros à leur toponyme
    await Promise.all(t.numeros.map(async numero => {
      await mongo.db.collection('numeros').findOneAndUpdate(
        {_id: numero._id},
        {$set: {toponyme: idToponyme}}
      )
    }))

    return {
      _id: idToponyme,
      nom,
      _bal,
      commune,
      positions,
      _created,
      _updated
    }
  }))

  // Création des toponymes avec les éléments utiles issues des voies
  await mongo.db.collection('toponymes').insertMany(toponymes)

  // Supprime les voies qui ont étaient converties en toponyme
  const oldVoiesToponymes = await mongo.db.collection('voies').find({positions: {$ne: []}}).toArray()
  await mongo.db.collection('voies').deleteMany({
    _id: {
      $in: oldVoiesToponymes.map(({_id}) => _id)
    }
  })

  // Supprime les champs 'complement' et 'positions' de voies, désormais inutile
  await mongo.db.collection('voies').updateMany({},
    {$unset: {complement: '', positions: ''}}
  )
}

async function main() {
  if (process.env.RUN_MIGRATION === 1) {
    await mongo.connect()
    await migrateToponymes()
    await mongo.disconnect()
  }
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})

module.exports = {migrateToponymes, groupToponymes, mergeToponymes}
