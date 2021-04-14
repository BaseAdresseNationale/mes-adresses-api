const test = require('ava')
const {MongoMemoryServer} = require('mongodb-memory-server')
const {uniq} = require('lodash')
const mongo = require('../../lib/util/mongo')
const {migrateToponymes, insertManyLieuxDits, insertManyHameaux} = require('../2021-03-22-new-toponyme')

const mongod = new MongoMemoryServer()

test.before('start server', async () => {
  await mongo.connect(await mongod.getUri())
})

test.after.always('cleanup', async () => {
  await mongo.disconnect()
  await mongod.stop()
})

test.serial('migrateToponymes', async t => {
  const idBal = new mongo.ObjectID()
  const idVoieA = new mongo.ObjectID()
  const idVoieB = new mongo.ObjectID()
  const idToponyme = new mongo.ObjectID()
  const idNumeroA = new mongo.ObjectID()
  const idNumeroB = new mongo.ObjectID()

  await mongo.db.collection('bases_locales').insertOne({
    _id: idBal
  })
  await mongo.db.collection('voies').insertOne({
    _id: idVoieA,
    nom: 'Rue du Vieux Chêne',
    commune: '27570',
    complement: 'La Haute Folie',
    _bal: idBal,
    positions: []
  })
  await mongo.db.collection('voies').insertOne({
    _id: idVoieB,
    nom: 'Impasse des Reneux',
    commune: '27570',
    complement: 'la Haute folie',
    _bal: idBal,
    positions: []
  })
  await mongo.db.collection('numeros').insertMany([{
    _id: idNumeroA,
    _bal: idBal,
    commune: '12345',
    voie: idVoieA,
    numero: 42,
    positions: []
  },
  {
    _id: idNumeroB,
    _bal: idBal,
    commune: '12345',
    voie: idVoieB,
    numero: 21,
    positions: []
  }])
  await mongo.db.collection('voies').insertOne({
    _id: idToponyme,
    nom: 'la Haute Folie',
    commune: '27570',
    _bal: idBal,
    positions: [{
      type: 'segment',
      point: {type: 'Point', coordinates: [1, 1]}
    }]
  })

  await migrateToponymes()

  const toponymes = await mongo.db.collection('toponymes').find().toArray()
  t.is(toponymes.length, 1)
  t.deepEqual(toponymes[0].positions, [{
    type: 'segment',
    point: {type: 'Point', coordinates: [1, 1]}
  }])
  t.falsy(await mongo.db.collection('toponymes').findOne({_id: idToponyme}))

  const voies = await mongo.db.collection('voies').find().toArray()
  t.is(voies.length, 2)
  t.is(voies[0].complement, undefined)
  t.is(voies[0].positions, undefined)
  t.is(voies[1].complement, undefined)
  t.is(voies[1].positions, undefined)

  const numeros = await mongo.db.collection('numeros').find().toArray()
  t.is(numeros.length, 2)
  t.is(uniq(numeros.map(({toponyme}) => `${toponyme}`)).length, 1)
})

test('insertManyLieutsDits', async t => {
  const idBal = new mongo.ObjectID()
  const idVoieA = new mongo.ObjectID()
  const idVoieB = new mongo.ObjectID()
  const referenceDate = new Date('2021-01-01')
  const positionsVoieA = [
    {
      type: 'segment',
      point: {type: 'Point', coordinates: [1, 2]}
    }
  ]
  const positionsVoieB = [
    {
      type: 'segment',
      point: {type: 'Point', coordinates: [2, 1]}
    }
  ]

  const toponymeA = {
    _id: idVoieA,
    nom: 'voieA',
    commune: '12345',
    _bal: idBal,
    _created: referenceDate,
    _updated: referenceDate,
    positions: positionsVoieA
  }

  const toponymeB = {
    _id: idVoieB,
    nom: 'voieB',
    commune: '12345',
    _bal: idBal,
    _created: referenceDate,
    _updated: referenceDate,
    positions: positionsVoieB
  }

  await mongo.db.collection('bases_locales').insertOne({
    _id: idBal,
    _updated: referenceDate
  })
  await mongo.db.collection('voies').insertMany([toponymeA, toponymeB])

  const toponymes = await mongo.db.collection('voies').find({positions: {$ne: []}}).toArray()
  const lieuxDits = await insertManyLieuxDits(toponymes)

  t.is(lieuxDits.length, 2)
  t.true(lieuxDits.some(l => l.nom === 'voieA'))
  t.true(lieuxDits.some(l => l.nom === 'voieB'))

  const lieuDitA = lieuxDits.find(l => l.nom === 'voieA')
  t.deepEqual(lieuDitA._created, new Date('2021-01-01'))
  t.deepEqual(lieuDitA._updated, new Date('2021-01-01'))
})

test('insertManyHameaux', async t => {
  const idBal = new mongo.ObjectID()
  const idVoie = new mongo.ObjectID()
  const idNumeroA = new mongo.ObjectID()
  const idNumeroB = new mongo.ObjectID()
  const referenceDate = new Date('2021-01-01')

  const numeroA = {
    _id: idNumeroA,
    _bal: idBal,
    commune: '12345',
    voie: idVoie,
    numero: 42,
    positions: [],
    _created: referenceDate,
    _updated: referenceDate
  }

  const numeroB = {
    _id: idNumeroB,
    _bal: idBal,
    commune: '12345',
    voie: idVoie,
    numero: 43,
    positions: [],
    _created: referenceDate,
    _updated: referenceDate
  }

  await mongo.db.collection('bases_locales').insertOne({
    _id: idBal,
    _created: referenceDate,
    _updated: referenceDate
  })
  await mongo.db.collection('voies').insertOne({
    _id: idVoie,
    nom: 'Nouvelle voie',
    commune: '12345',
    complement: 'Le Moulin',
    _bal: idBal,
    positions: [],
    _created: referenceDate,
    _updated: referenceDate
  })

  await mongo.db.collection('numeros').insertMany([numeroA, numeroB])

  const voieComplements = await mongo.db.collection('voies').find({complement: {$ne: null}, positions: {$eq: []}}).toArray()
  await insertManyHameaux(voieComplements)

  const toponyme = await mongo.db.collection('toponymes').find({nom: 'Le Moulin'}).toArray()

  t.is(toponyme.length, 1)
  t.deepEqual(numeroA.toponyme, toponyme._id)
  t.deepEqual(numeroB.toponyme, toponyme._id)
})
