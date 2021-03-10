const test = require('ava')
const {MongoMemoryServer} = require('mongodb-memory-server')
const mongo = require('../../util/mongo')
const Toponyme = require('../toponyme')

const mongod = new MongoMemoryServer()

test.before('start server', async () => {
  await mongo.connect(await mongod.getUri())
})

test.after.always('cleanup', async () => {
  await mongo.disconnect()
  await mongod.stop()
})

test('create a Toponyme', async t => {
  const _id = new mongo.ObjectID()

  await mongo.db.collection('bases_locales').insertOne({
    _id,
    _updated: new Date('2021-01-01')
  })

  const toponyme = await Toponyme.create(_id, '12345', {nom: 'foo'})

  const keys = ['_id', '_bal', 'nom', 'positions', 'commune', '_created', '_updated']
  t.true(keys.every(k => k in toponyme))
  t.is(Object.keys(toponyme).length, keys.length)

  const bal = await mongo.db.collection('bases_locales').findOne({_id})
  t.deepEqual(toponyme._created, bal._updated)
})

test('create a Toponyme / with positions', async t => {
  const _id = new mongo.ObjectID()

  await mongo.db.collection('bases_locales').insertOne({_id})

  const position = {
    point: {type: 'Point', coordinates: [0, 0]},
    source: 'foo',
    type: 'entrée'
  }
  const toponyme = await Toponyme.create(_id, '12345', {
    nom: 'foo',
    positions: [position]
  })

  t.deepEqual(toponyme.positions, [position])
})

test('update a Toponyme', async t => {
  const _idBal = new mongo.ObjectID()
  const _id = new mongo.ObjectID()

  await mongo.db.collection('bases_locales').insertOne({
    _id: _idBal,
    _updated: new Date('2021-01-01')
  })
  await mongo.db.collection('toponymes').insertOne({
    _id,
    _bal: _idBal,
    nom: 'foo',
    commune: '12345'
  })

  const toponyme = await Toponyme.update(_id, {
    nom: 'bar',
    positions: [{
      point: {type: 'Point', coordinates: [0, 0]},
      source: 'source',
      type: 'entrée'
    }]
  })

  t.is(toponyme.nom, 'bar')
  t.is(toponyme.positions.length, 1)

  const bal = await mongo.db.collection('bases_locales').findOne({_id: _idBal})
  t.deepEqual(bal._updated, toponyme._updated)
})

test('create a Toponyme / base locale do not exists', t => {
  const _id = new mongo.ObjectID()
  return t.throwsAsync(Toponyme.create(_id, '12345', {nom: 'toponyme'}, {message: 'Base locale not found'}))
})

test('update a Toponyme / not found', t => {
  const _id = new mongo.ObjectID()
  return t.throwsAsync(() => Toponyme.update(_id, {nom: 'bar'}), {message: 'Toponyme not found'})
})

test('remove a Toponyme', async t => {
  const _idBal = new mongo.ObjectID()
  const _id = new mongo.ObjectID()
  const referenceDate = new Date('2021-01-01')

  await mongo.db.collection('bases_locales').insertOne({
    _id: _idBal,
    _updated: referenceDate
  })
  await mongo.db.collection('toponymes').insertOne({
    _id,
    _bal: _idBal,
    nom: 'foo',
    commune: '12345'
  })

  await Toponyme.remove(_id)

  t.falsy(await mongo.db.collection('toponymes').findOne({_id}))

  const bal = await mongo.db.collection('bases_locales').findOne({_id: _idBal})
  t.notDeepEqual(bal._updated, referenceDate)
})