const test = require('ava')
const {MongoMemoryServer} = require('mongodb-memory-server')
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

test('touchDocument', async t => {
  const _id = new mongo.ObjectId()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    _updated: new Date('2019-01-01')
  })

  await mongo.touchDocument('bases_locales', _id, new Date('2019-01-02'))

  const document = await mongo.db.collection('bases_locales').findOne({_id})
  t.deepEqual(document._updated, new Date('2019-01-02'))
})

test('touchDocument / default date', async t => {
  const _id = new mongo.ObjectId()
  const referenceDate = new Date('2019-01-01')
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    _updated: referenceDate
  })

  await mongo.touchDocument('bases_locales', _id)

  const document = await mongo.db.collection('bases_locales').findOne({_id})
  t.not(document._updated, referenceDate)
})
