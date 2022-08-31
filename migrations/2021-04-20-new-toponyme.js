#!/usr/bin/env node
/* eslint no-await-in-loop: off */
require('dotenv').config()
const {keyBy} = require('lodash')
const {normalize} = require('@etalab/adresses-util/lib/voies')
const mongo = require('../lib/util/mongo')
const {ObjectId} = require('../lib/util/mongo')

const now = new Date()

async function runMigrationOnContext({_bal, commune}) {
  // On récupère toutes les voies avec des positions, considérées actuellement comme des toponymes
  const voiesToponymes = await mongo.db.collection('voies').find({_bal, commune, positions: {$ne: []}}).toArray()

  // On construit les nouveaux toponymes à partir des anciennes voies/toponymes
  const toponymes = voiesToponymes.map(voieToponyme => ({
    _bal,
    commune,
    _id: new ObjectId(),
    nom: voieToponyme.nom,
    positions: voieToponyme.positions,
    _created: voieToponyme._created,
    _updated: voieToponyme._updated
  }))

  // On créé un index selon le libellé normalisé, qui nous servira à rechercher à partir du complément
  const toponymesIndex = keyBy(toponymes, t => normalize(t.nom))

  // Récupères toutes les voies avec un complément, ce complément est considéré comme un toponyme
  const voiesAvecComplement = await mongo.db.collection('voies').find({_bal, commune, complement: {$ne: null}}).toArray()

  // Pour chacun de ces voies on se rattache à un toponyme existant ou on en créé un
  for (const voie of voiesAvecComplement) {
    // On normalise le libellé du complément
    const normalizedComplement = normalize(voie.complement)

    // Si on a pas déjà ce toponyme, on le créé et on l'ajoute à l'index
    if (!(normalizedComplement in toponymesIndex)) {
      const toponyme = {
        _bal,
        commune,
        _id: new ObjectId(),
        nom: voie.complement,
        positions: [],
        _created: now,
        _updated: now
      }

      toponymes.push(toponyme)
      toponymesIndex[normalizedComplement] = toponyme
    }

    // On récupère le toponyme correspondant (qu'on l'ait créé juste avant ou pas)
    const toponymeId = toponymesIndex[normalizedComplement]._id

    // On migre les numéros de la voie en ajoutant la référence au toponyme
    await mongo.db.collection('numeros').updateMany({voie: voie._id}, {$set: {toponyme: toponymeId}})
  }

  // S'il n'y a pas de toponymes dans la liste, pas la peine de continuer
  if (toponymes.length === 0) {
    return
  }

  // On insert les toponymes qu'on a créé dans la nouvelle collection de la base de données
  await mongo.db.collection('toponymes').insertMany(toponymes)

  // On supprime les voies qui étaient considérées comme des toponymes
  await mongo.db.collection('voies').deleteMany({_bal, commune, positions: {$ne: []}})

  // On supprime le champ complement
  await mongo.db.collection('voies').updateMany({_bal, commune}, {$unset: {complement: 1, positions: 1}})
}

async function listContexts() {
  const result = await mongo.db.collection('bases_locales').aggregate([
    {$unwind: '$communes'}
  ]).toArray()

  return result.map(({_id, communes}) => ({_bal: _id, commune: communes}))
}

async function main() {
  await mongo.connect()

  const contexts = await listContexts()

  for (const context of contexts) {
    await runMigrationOnContext(context)
  }

  await mongo.disconnect()
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
