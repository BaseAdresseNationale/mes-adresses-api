const test = require('ava')
const {pick} = require('lodash')
const {MongoMemoryServer} = require('mongodb-memory-server')
const mongo = require('../../util/mongo')
const Commune = require('../commune')

const mongod = new MongoMemoryServer()

test.before('start server', async () => {
  await mongo.connect(await mongod.getUri())
})

test.after.always('cleanup', async () => {
  await mongo.disconnect()
  await mongod.stop()
})

test('create a Commune', async t => {
  const _id = new mongo.ObjectID()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    _updated: new Date('2021-01-01')
  })
  const commune = await Commune.create(_id, {
    code: '27115'
  })

  const keys = ['status', '_updated', '_created', '_id', '_bal', 'code']
  t.true(keys.every(k => k in commune))
  t.true(commune.status === 'draft')
  t.is(Object.keys(commune).length, 6)
})

test('create a Commune : baseLocale not found', t => {
  const _id = new mongo.ObjectID()
  return t.throwsAsync(() => Commune.create(_id, {code: '27115'}))
})

test('create a Commune : demo', async t => {
  const _id = new mongo.ObjectID()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    _updated: new Date('2021-01-01')
  })
  const commune = await Commune.create(_id, {
    code: '27115',
    status: 'demo'
  })

  t.true(commune.status === 'demo')
})

test('update a Commune', async t => {
  const balId = new mongo.ObjectID()
  await mongo.db.collection('bases_locales').insertOne({
    _id: balId,
    _updated: new Date('2021-01-01')
  })
  const _id = new mongo.ObjectID()
  await mongo.db.collection('communes').insertOne({
    _id,
    _bal: balId,
    code: '27115',
    status: 'draft',
    _updated: new Date('2021-01-01')
  })

  const commune = await Commune.update(_id, {status: 'ready-to-publish'})

  t.is(commune.code, '27115')
  t.is(commune.status, 'ready-to-publish')
})

test('update a Commune / not found', t => {
  const _id = new mongo.ObjectID()
  return t.throwsAsync(() => Commune.update(_id, {code: '27115'}), {message: 'Commune not found'})
})

test('importMany', async t => {
  const _idBal = new mongo.ObjectID()
  const commune1 = {
    _bal: _idBal,
    code: '27115',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-05')
  }
  const commune2 = {
    _bal: _idBal,
    code: '54084'
  }

  Commune.importMany(_idBal, [commune1, commune2], {validate: false})
  const communes = await mongo.db.collection('communes').find({_bal: _idBal}).toArray()
  t.is(communes.length, 2)
  const v1 = communes.find(v => v.code === '27115')
  t.deepEqual(
    pick(v1, 'code', '_updated', '_created'),
    pick(commune1, 'code', 'status', '_updated', '_created')
  )
  const v2 = communes.find(v => v.code === '54084')
  t.deepEqual(
    pick(v2, 'code'),
    pick(commune2, 'code', 'status')
  )
})

test('importMany / keeping ids', async t => {
  const _idBal = new mongo.ObjectID()
  const _idCommune1 = new mongo.ObjectID()
  const _idCommune2 = new mongo.ObjectID()
  const commune1 = {
    _id: _idCommune1,
    _bal: _idBal,
    code: '27115'
  }
  const commune2 = {
    _id: _idCommune2,
    _bal: _idBal,
    code: '54084'
  }

  Commune.importMany(_idBal, [commune1, commune2], {validate: false, keepIds: true})
  const communes = await mongo.db.collection('communes').find({_bal: _idBal}).toArray()
  t.is(communes.length, 2)
  const v1 = communes.find(v => v.code === '27115')
  t.deepEqual(pick(v1, 'code'), pick(commune1, 'code'))
  t.true(v1._id.equals(_idCommune1))
  const v2 = communes.find(v => v.code === '54084')
  t.deepEqual(pick(v2, 'code'), pick(commune2, 'code'))
  t.true(v2._id.equals(_idCommune2))
})
