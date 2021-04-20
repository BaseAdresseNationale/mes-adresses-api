const test = require('ava')
const {MongoMemoryServer} = require('mongodb-memory-server')
const {uniq} = require('lodash')
const mongo = require('../../lib/util/mongo')
const {migrateToponymes} = require('../2021-04-20-new-toponyme')

const mongod = new MongoMemoryServer()

test.before('start server', async () => {
  await mongo.connect(await mongod.getUri())
  await mongo.db.dropDatabase()
})

test.after.always('cleanup', async () => {
  await mongo.disconnect()
  await mongod.stop()
})

test.afterEach(async () => {
  await mongo.db.dropDatabase()
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

test.serial('migrateToponymes - voie complement without numero', async t => {
  const idBal = new mongo.ObjectID()
  const idVoieA = new mongo.ObjectID()
  const idVoieB = new mongo.ObjectID()

  await mongo.db.collection('bases_locales').insertOne({
    _id: idBal
  })
  await mongo.db.collection('voies').insertOne({
    _id: idVoieA,
    nom: 'voie sans numéro',
    commune: '27570',
    complement: 'La Troudière',
    _bal: idBal,
    positions: [],
    _created: new Date('2021-01-01'),
    _updated: new Date('2021-01-01')
  })
  await mongo.db.collection('voies').insertOne({
    _id: idVoieB,
    nom: 'voie avec numéros',
    commune: '27570',
    _bal: idBal,
    positions: [],
    _created: new Date('2021-01-01'),
    _updated: new Date('2021-01-01')
  })
  await mongo.db.collection('numero').insertOne({
    _id: new mongo.ObjectID(),
    _bal: idBal,
    commune: '12345',
    voie: idVoieB,
    numero: 42,
    positions: [],
    _created: new Date('2021-01-01'),
    _updated: new Date('2021-01-01')
  })

  await migrateToponymes()

  const toponymes = await mongo.db.collection('toponymes').find().toArray()
  t.is(toponymes.length, 1)
  t.deepEqual(toponymes[0]._bal, idBal)
  t.deepEqual(toponymes[0].positions, [])

  const voies = await mongo.db.collection('voies').find().toArray()
  t.is(voies.length, 2)
  t.is(voies[0].complement, undefined)
  t.is(voies[0].positions, undefined)
  t.is(voies[1].complement, undefined)
  t.is(voies[1].positions, undefined)
})

test.serial('migrateToponymes - voie complement without numero + voie/toponyme', async t => {
  const idBal = new mongo.ObjectID()
  const idVoieA = new mongo.ObjectID()
  const idVoieB = new mongo.ObjectID()
  const idToponyme = new mongo.ObjectID()

  await mongo.db.collection('bases_locales').insertOne({
    _id: idBal
  })
  await mongo.db.collection('voies').insertOne({
    _id: idVoieA,
    nom: 'voie sans numéro',
    commune: '27570',
    complement: 'La Troudière',
    _bal: idBal,
    positions: [],
    _created: new Date('2021-01-01'),
    _updated: new Date('2021-01-01')
  })
  await mongo.db.collection('voies').insertOne({
    _id: idVoieB,
    nom: 'voie avec numéros',
    commune: '27570',
    _bal: idBal,
    positions: [],
    _created: new Date('2021-01-01'),
    _updated: new Date('2021-01-01')
  })
  await mongo.db.collection('numero').insertOne({
    _id: new mongo.ObjectID(),
    _bal: idBal,
    commune: '12345',
    voie: idVoieB,
    numero: 42,
    positions: [],
    _created: new Date('2021-01-01'),
    _updated: new Date('2021-01-01')
  })
  await mongo.db.collection('voies').insertOne({
    _id: idToponyme,
    nom: 'La Troudière',
    commune: '27570',
    _bal: idBal,
    positions: [{
      type: 'segment',
      point: {type: 'Point', coordinates: [1, 1]}
    }],
    _created: new Date('2021-01-01'),
    _updated: new Date('2021-01-01')
  })

  await migrateToponymes()

  const toponymes = await mongo.db.collection('toponymes').find().toArray()
  t.is(toponymes.length, 1)
  t.deepEqual(toponymes[0]._bal, idBal)
  t.deepEqual(toponymes[0].positions, [{
    type: 'segment',
    point: {type: 'Point', coordinates: [1, 1]}
  }])

  const voies = await mongo.db.collection('voies').find().toArray()
  t.is(voies.length, 2)
  t.is(voies[0].complement, undefined)
  t.is(voies[0].positions, undefined)
  t.is(voies[1].complement, undefined)
  t.is(voies[1].positions, undefined)
})
