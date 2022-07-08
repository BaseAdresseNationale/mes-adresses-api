const test = require('ava')
const {MongoMemoryServer} = require('mongodb-memory-server')
const {addNomAlt} = require('../../nom-alt')
const mongo = require('../mongo')

let mongod

test.before('start server', async () => {
  mongod = await MongoMemoryServer.create()
  await mongo.connect(mongod.getUri())
})

test.after.always('cleanup', async () => {
  await mongo.disconnect()
  await mongod.stop()
})

test('Add nomAlt to a voie', async t => {
  const _idBAL = new mongo.ObjectId()
  const _idVoie = new mongo.ObjectId()
  await mongo.db.collection('bases_locales').insertOne({
    _id: _idBAL,
    commune: '97125',
    _updated: new Date('2019-01-01')
  })
  await mongo.db.collection('voies').insertOne({
    _id: _idVoie,
    _bal: _idBAL,
    commune: '97125',
  })

  const nomAlt = await addNomAlt('voies', _idVoie, {gyn: 'Lapwent'})
  t.deepEqual(nomAlt, {gyn: 'Lapwent'})
})

test('Add nomAlt to a voie / with existing nomAlt', async t => {
  const _idBAL = new mongo.ObjectId()
  const _idVoie = new mongo.ObjectId()
  await mongo.db.collection('bases_locales').insertOne({
    _id: _idBAL,
    commune: '97125',
    _updated: new Date('2019-01-01')
  })
  await mongo.db.collection('voies').insertOne({
    _id: _idVoie,
    _bal: _idBAL,
    commune: '97125',
    nomAlt: {gyn: 'Lapwent'}
  })

  const nomAlt = await addNomAlt('voies', _idVoie, {bre: 'Ar Beg'})
  t.deepEqual(nomAlt, {gyn: 'Lapwent', bre: 'Ar Beg'})
})

test('Nothing to add / with existing nomAlt', async t => {
  const _idBAL = new mongo.ObjectId()
  const _idVoie = new mongo.ObjectId()
  await mongo.db.collection('bases_locales').insertOne({
    _id: _idBAL,
    commune: '97125',
    _updated: new Date('2019-01-01')
  })
  await mongo.db.collection('voies').insertOne({
    _id: _idVoie,
    _bal: _idBAL,
    commune: '97125',
    nomAlt: {gyn: 'Lapwent'}
  })

  const nomAlt = await addNomAlt('voies', _idVoie)
  t.deepEqual(nomAlt, {gyn: 'Lapwent'})
})

test('Nothing to add / without existing nomAlt', async t => {
  const _idBAL = new mongo.ObjectId()
  const _idVoie = new mongo.ObjectId()
  await mongo.db.collection('bases_locales').insertOne({
    _id: _idBAL,
    commune: '97125',
    _updated: new Date('2019-01-01')
  })
  await mongo.db.collection('voies').insertOne({
    _id: _idVoie,
    _bal: _idBAL,
    commune: '97125'
  })

  const nomAlt = await addNomAlt('voies', _idVoie)
  t.is(nomAlt, null)
})
