const test = require('ava')
const {MongoDBServer} = require('mongomem')
const mongo = require('../../util/mongo')
const Voie = require('../voie')

test.before('start server', async () => {
  MongoDBServer.port = 27019 // Temp fix
  await MongoDBServer.start()
  await mongo.connect(await MongoDBServer.getConnectionString())
})

test.after.always('cleanup', async () => {
  await mongo.disconnect()
  await MongoDBServer.tearDown()
})

test('create a Voie', async t => {
  const _id = new mongo.ObjectID()
  const voie = await Voie.create(_id, '12345', {nom: 'foo'})

  t.truthy(voie._id)
  t.is(voie._bal, _id)
  t.is(voie.commune, '12345')
  t.is(voie.nom, 'foo')
  t.deepEqual(voie.positions, [])
  t.truthy(voie._created)
  t.truthy(voie._updated)

  t.is(Object.keys(voie).length, 8)
})

test('create a Voie / with positions', async t => {
  const _id = new mongo.ObjectID()
  const position = {
    point: {type: 'Point', coordinates: [0, 0]},
    source: 'foo',
    type: 'entrée'
  }
  const voie = await Voie.create(_id, '12345', {
    nom: 'foo',
    positions: [position]
  })

  t.deepEqual(voie.positions, [position])
})

test('create a Voie / already exists', async t => {
  const _id = new mongo.ObjectID()
  await mongo.db.collection('voies').insertOne({
    _bal: _id,
    nom: 'foo',
    commune: '12345'
  })

  await t.throwsAsync(() => Voie.create(_id, '12345', {nom: 'foo'}), 'Voie already exists')
})

test('update a Voie', async t => {
  const _id = new mongo.ObjectID()
  await mongo.db.collection('voies').insertOne({
    _id,
    _bal: new mongo.ObjectID(),
    nom: 'foo',
    commune: '12345'
  })

  const voie = await Voie.update(_id, {nom: 'bar'})

  t.is(voie.nom, 'bar')
})

test('update a Voie / not found', t => {
  const _id = new mongo.ObjectID()
  return t.throwsAsync(() => Voie.update(_id, {nom: 'bar'}), 'Voie not found')
})

test('remove a Voie', async t => {
  const _id = new mongo.ObjectID()
  await mongo.db.collection('voies').insertOne({_id, nom: 'foo'})
  await mongo.db.collection('numeros').insertOne({_voie: _id, numero: 1})

  await Voie.remove(_id)

  t.falsy(await mongo.db.collection('voies').findOne({_id}))
  t.falsy(await mongo.db.collection('numeros').findOne({_voie: _id}))
})
