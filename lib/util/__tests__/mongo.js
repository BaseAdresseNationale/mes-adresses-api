const test = require('ava')
const {MongoMemoryServer} = require('mongodb-memory-server')
const mongo = require('../mongo')

const mongod = new MongoMemoryServer()

test.before('start server', async () => {
  await mongo.connect(await mongod.getUri())
})

test.after.always('cleanup', async () => {
  await mongo.disconnect()
  await mongod.stop()
})

test('touchDocument', async t => {
  const _id = new mongo.ObjectID()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    _updated: new Date('2019-01-01')
  })

  await mongo.touchDocument('bases_locales', _id, new Date('2019-01-02'))

  const document = await mongo.db.collection('bases_locales').findOne({_id})
  t.deepEqual(document._updated, new Date('2019-01-02'))
})

test('touchDocument / default date', async t => {
  const _id = new mongo.ObjectID()
  const referenceDate = new Date('2019-01-01')
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    _updated: referenceDate
  })

  await mongo.touchDocument('bases_locales', _id)

  const document = await mongo.db.collection('bases_locales').findOne({_id})
  t.not(document._updated, referenceDate)
})
