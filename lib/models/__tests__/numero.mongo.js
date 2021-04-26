const test = require('ava')
const {MongoMemoryServer} = require('mongodb-memory-server')
const mongo = require('../../util/mongo')
const Numero = require('../numero')

const mongod = new MongoMemoryServer()

test.before('start server', async () => {
  await mongo.connect(await mongod.getUri())
})

test.after.always('cleanup', async () => {
  await mongo.disconnect()
  await mongod.stop()
})

test('create a numero', async t => {
  const idBal = new mongo.ObjectID()
  const _id = new mongo.ObjectID()
  const referenceDate = new Date('2019-01-01')

  await mongo.db.collection('bases_locales').insertOne({
    _id: idBal,
    _updated: referenceDate
  })
  await mongo.db.collection('voies').insertOne({
    _id,
    _bal: idBal,
    _updated: referenceDate
  })
  const numero = await Numero.create(_id, {
    numero: 42,
    suffixe: 'foo',
    comment: 'bar',
    positions: []
  })

  const keys = ['_id', '_bal', 'commune', '_updated', '_created', 'voie', 'numero', 'suffixe', 'comment', 'toponyme', 'positions']
  t.true(keys.every(k => k in numero))
  t.is(Object.keys(numero).length, keys.length)

  const bal = await mongo.db.collection('bases_locales').findOne({_id: idBal})
  t.deepEqual(numero._created, bal._updated)

  const voie = await mongo.db.collection('voies').findOne({_id})
  t.deepEqual(numero._created, voie._updated)
})

test('create a numero / invalid numero type', t => {
  const idVoie = new mongo.ObjectID()
  return t.throwsAsync(Numero.create(idVoie, {
    numero: '042',
    suffixe: 'foo',
    positions: []
  }), {message: 'Invalid payload'})
})

test('create a numero / minimal', async t => {
  const _id = new mongo.ObjectID()
  await mongo.db.collection('voies').insertOne({_id})
  const numero = await Numero.create(_id, {numero: 42})

  const keys = ['_id', '_bal', 'commune', '_updated', '_created', 'voie', 'numero', 'suffixe', 'positions', 'comment', 'toponyme']
  t.true(keys.every(k => k in numero))
  t.is(Object.keys(numero).length, keys.length)
})

test('create a numero with uppercase suffixe', async t => {
  const _id = new mongo.ObjectID()
  await mongo.db.collection('voies').insertOne({_id})
  const numero = await Numero.create(_id, {numero: 42, suffixe: 'FOO'})

  t.is(numero.suffixe, 'foo')
})

test('create a numero with toponyme', async t => {
  const _idBal = new mongo.ObjectID()
  const _idVoie = new mongo.ObjectID()
  const _idToponyme = new mongo.ObjectID()

  await mongo.db.collection('voies').insertOne({_id: _idVoie})
  await mongo.db.collection('toponymes').insertOne({
    _id: _idToponyme,
    _bal: _idBal,
    nom: 'foo',
    commune: '12345'
  })
  const numero = await Numero.create(_idVoie, {numero: 42, toponyme: _idToponyme.toString()})

  t.deepEqual(numero.toponyme, _idToponyme)
})

test('create a numero / voie do not exists', t => {
  const _id = new mongo.ObjectID()
  return t.throwsAsync(Numero.create(_id, {numero: 42}, {message: 'Voie not found'}))
})

test('importMany', async t => {
  const idBal = new mongo.ObjectID()
  const idVoie = new mongo.ObjectID()

  const numero1 = {voie: idVoie, numero: 42, commune: '12345', _created: new Date('2019-01-01'), _updated: new Date('2019-01-05')}
  const numero2 = {voie: idVoie, numero: 24, commune: '12345'}

  await Numero.importMany(idBal, [numero1, numero2], {validate: false})

  const numeros = await mongo.db.collection('numeros').find({_bal: idBal, voie: idVoie}).toArray()
  t.is(numeros.length, 2)
  t.true(numeros.some(n => n.numero === 24))
  t.true(numeros.some(n => n.numero === 42))
  const n42 = numeros.find(n => n.numero === 42)
  t.deepEqual(n42._created, new Date('2019-01-01'))
  t.deepEqual(n42._updated, new Date('2019-01-05'))
})

test('update a numero', async t => {
  const idBal = new mongo.ObjectID()
  const idVoie = new mongo.ObjectID()
  const _id = new mongo.ObjectID()
  const referenceDate = new Date('2019-01-01')

  await mongo.db.collection('bases_locales').insertOne({
    _id: idBal,
    _updated: referenceDate
  })
  await mongo.db.collection('voies').insertOne({
    _id: idVoie,
    _bal: idBal,
    commune: '12345',
    _updated: referenceDate
  })
  await mongo.db.collection('numeros').insertOne({
    _id,
    _bal: idBal,
    commune: '12345',
    voie: idVoie,
    numero: 42,
    suffixe: 'foo',
    positions: [],
    _created: referenceDate,
    _updated: referenceDate
  })

  const numero = await Numero.update(_id, {
    numero: 24,
    suffixe: 'BAR',
    comment: 'Commentaire de numéro 123 !',
    positions: [{
      point: {type: 'Point', coordinates: [0, 0]},
      source: 'source',
      type: 'entrée'
    }]
  })

  t.is(numero.numero, 24)
  t.is(numero.suffixe, 'bar')
  t.is(numero.comment, 'Commentaire de numéro 123 !')
  t.is(numero.positions.length, 1)
  t.is(Object.keys(numero).length, 10)

  const bal = await mongo.db.collection('bases_locales').findOne({_id: idBal})
  t.notDeepEqual(numero._created, bal._updated)
})

test('update a numero / no suffixe', async t => {
  const idBal = new mongo.ObjectID()
  const idVoie = new mongo.ObjectID()
  const _id = new mongo.ObjectID()
  const referenceDate = new mongo.ObjectID()

  await mongo.db.collection('bases_locales').insertOne({
    _id: idBal,
    _updated: referenceDate
  })
  await mongo.db.collection('voies').insertOne({
    _id: idVoie,
    _bal: idBal,
    commune: '12345',
    _updated: referenceDate
  })
  await mongo.db.collection('numeros').insertOne({
    _id,
    _bal: idBal,
    commune: '12345',
    voie: idVoie,
    numero: 42,
    suffixe: 'foo'
  })

  const numero = await Numero.update(_id, {
    numero: 24
  })

  t.is(numero.numero, 24)
  t.is(numero.suffixe, 'foo')
})

test('update a numero / without suffixe', async t => {
  const idBal = new mongo.ObjectID()
  const idVoie = new mongo.ObjectID()
  const _id = new mongo.ObjectID()
  const referenceDate = new mongo.ObjectID()

  await mongo.db.collection('bases_locales').insertOne({
    _id: idBal,
    _updated: referenceDate
  })
  await mongo.db.collection('voies').insertOne({
    _id: idVoie,
    _bal: idBal,
    commune: '12345',
    _updated: referenceDate
  })
  await mongo.db.collection('numeros').insertOne({
    _id,
    _bal: idBal,
    commune: '12345',
    voie: idVoie,
    numero: 42
  })

  const numero = await Numero.update(_id, {
    numero: 24
  })

  t.is(numero.numero, 24)
  t.is(numero.suffixe, undefined)
})

test('update a numero / change voie', async t => {
  const idBal = new mongo.ObjectID()
  const idVoieA = new mongo.ObjectID()
  const idVoieB = new mongo.ObjectID()
  const _id = new mongo.ObjectID()
  const referenceDate = new Date('2019-01-01')

  await mongo.db.collection('bases_locales').insertOne({
    _id: idBal,
    _updated: referenceDate
  })
  await mongo.db.collection('voies').insertMany([{
    _id: idVoieA,
    _bal: idBal,
    commune: '12345',
    _updated: referenceDate
  }, {
    _id: idVoieB,
    _bal: idBal,
    commune: '12345',
    _updated: referenceDate
  }])
  await mongo.db.collection('numeros').insertOne({
    _id,
    _bal: idBal,
    commune: '12345',
    voie: idVoieA,
    numero: 42,
    suffixe: 'foo',
    positions: [],
    _created: referenceDate,
    _updated: referenceDate
  })

  const numero = await Numero.update(_id, {
    numero: 24,
    voie: idVoieB.toString(),
    suffixe: 'BAR',
    comment: 'Commentaire de numéro 123 !',
    positions: [{
      point: {type: 'Point', coordinates: [0, 0]},
      source: 'source',
      type: 'entrée'
    }]
  })

  t.is(numero.numero, 24)
  t.is(numero.suffixe, 'bar')
  t.is(numero.comment, 'Commentaire de numéro 123 !')
  t.is(numero.positions.length, 1)
  t.is(Object.keys(numero).length, 10)

  t.deepEqual(numero.voie, idVoieB)
})

test('update a numero / add toponyme', async t => {
  const idBal = new mongo.ObjectID()
  const idVoie = new mongo.ObjectID()
  const idToponyme = new mongo.ObjectID()
  const _id = new mongo.ObjectID()
  const referenceDate = new Date('2021-01-01')

  await mongo.db.collection('bases_locales').insertOne({
    _id: idBal,
    _updated: referenceDate
  })
  await mongo.db.collection('voies').insertOne({
    _id: idVoie,
    _bal: idBal,
    commune: '12345',
    _updated: referenceDate
  })
  await mongo.db.collection('toponymes').insertOne({
    _id: idToponyme,
    _bal: idBal,
    nom: 'foo',
    commune: '12345'
  })
  await mongo.db.collection('numeros').insertOne({
    _id,
    _bal: idBal,
    commune: '12345',
    voie: idVoie,
    numero: 42,
    positions: [],
    _created: referenceDate,
    _updated: referenceDate
  })

  const numero = await Numero.update(_id, {
    numero: 24,
    voie: idVoie.toString(),
    toponyme: idToponyme.toString(),
    positions: [{
      point: {type: 'Point', coordinates: [0, 0]},
      source: 'source',
      type: 'entrée'
    }]
  })

  t.is(numero.numero, 24)
  t.is(numero.positions.length, 1)
  t.is(Object.keys(numero).length, 9)
  t.deepEqual(numero.toponyme, idToponyme)
})

test('update a numero / change toponyme', async t => {
  const idBal = new mongo.ObjectID()
  const idVoie = new mongo.ObjectID()
  const idToponymeA = new mongo.ObjectID()
  const idToponymeB = new mongo.ObjectID()
  const _id = new mongo.ObjectID()
  const referenceDate = new Date('2021-01-01')

  await mongo.db.collection('bases_locales').insertOne({
    _id: idBal,
    _updated: referenceDate
  })
  await mongo.db.collection('voies').insertOne({
    _id: idVoie,
    _bal: idBal,
    commune: '12345',
    _updated: referenceDate
  })
  await mongo.db.collection('toponymes').insertMany([{
    _id: idToponymeA,
    _bal: idBal,
    nom: 'foo',
    commune: '12345'
  }, {
    _id: idToponymeB,
    _bal: idBal,
    nom: 'foo',
    commune: '12345'
  }])
  await mongo.db.collection('numeros').insertOne({
    _id,
    _bal: idBal,
    commune: '12345',
    voie: idVoie,
    numero: 42,
    toponyme: idToponymeA.toString(),
    positions: [],
    _created: referenceDate,
    _updated: referenceDate
  })

  const numero = await Numero.update(_id, {
    numero: 42,
    voie: idVoie.toString(),
    toponyme: idToponymeB.toString(),
    positions: [{
      point: {type: 'Point', coordinates: [0, 0]},
      source: 'source',
      type: 'entrée'
    }]
  })

  t.is(numero.numero, 42)
  t.is(numero.positions.length, 1)
  t.is(Object.keys(numero).length, 9)
  t.deepEqual(numero.toponyme, idToponymeB)
})

test('update a numero / not found', t => {
  const _id = new mongo.ObjectID()
  return t.throwsAsync(() => Numero.update(_id, {numero: 42}), {message: 'Numero not found'})
})

test('delete a numero', async t => {
  const idBal = new mongo.ObjectID()
  const idVoie = new mongo.ObjectID()
  const _id = new mongo.ObjectID()
  const referenceDate = new Date('2019-01-01')

  await mongo.db.collection('bases_locales').insertOne({
    _id: idBal,
    _updated: referenceDate
  })
  await mongo.db.collection('voies').insertOne({
    _bal: idBal,
    _id: idVoie,
    commune: '12345',
    _updated: referenceDate
  })
  await mongo.db.collection('numeros').insertOne({
    _bal: idBal,
    voie: idVoie,
    _id,
    commune: '12345',
    numero: 42,
    suffixe: 'foo',
    positions: [],
    _created: referenceDate,
    _updated: referenceDate
  })

  await Numero.remove(_id)

  const numero = await mongo.db.collection('numeros').findOne({_id})
  t.falsy(numero)

  const bal = await mongo.db.collection('bases_locales').findOne({_id: idBal})
  t.notDeepEqual(referenceDate, bal._updated)

  const voie = await mongo.db.collection('voies').findOne({_id: idVoie})
  t.notDeepEqual(referenceDate, voie._updated)
})
