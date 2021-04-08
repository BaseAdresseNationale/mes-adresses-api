const test = require('ava')
const {MongoMemoryServer} = require('mongodb-memory-server')
const {pick} = require('lodash')
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

test('importMany', async t => {
  const _idBal = new mongo.ObjectID()
  const toponyme1 = {
    _bal: _idBal,
    nom: 'foo',
    commune: '12345',
    positions: [],
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-05')
  }
  const toponyme2 = {
    _bal: _idBal,
    nom: 'bar',
    commune: '23456',
    positions: []
  }

  Toponyme.importMany(_idBal, [toponyme1, toponyme2], {validate: false})
  const toponymes = await mongo.db.collection('toponymes').find({_bal: _idBal}).toArray()
  t.is(toponymes.length, 2)

  const v1 = toponymes.find(v => v.nom === 'foo')
  t.deepEqual(
    pick(v1, 'nom', 'commune', 'positions', '_updated', '_created'),
    pick(toponyme1, 'nom', 'commune', 'positions', '_updated', '_created')
  )

  const v2 = toponymes.find(v => v.nom === 'bar')
  t.deepEqual(
    pick(v2, 'nom', 'commune', 'positions'),
    pick(toponyme2, 'nom', 'commune', 'positions')
  )
})

test('importMany / keeping ids', async t => {
  const _idBal = new mongo.ObjectID()
  const _idToponyme1 = new mongo.ObjectID()
  const _idToponyme2 = new mongo.ObjectID()
  const toponyme1 = {
    _id: _idToponyme1,
    _bal: _idBal,
    nom: 'foo',
    commune: '12345',
    positions: []
  }
  const toponyme2 = {
    _id: _idToponyme2,
    _bal: _idBal,
    nom: 'bar',
    commune: '23456',
    positions: []
  }

  Toponyme.importMany(_idBal, [toponyme1, toponyme2], {validate: false, keepIds: true})
  const voies = await mongo.db.collection('toponymes').find({_bal: _idBal}).toArray()
  t.is(voies.length, 2)

  const v1 = voies.find(v => v.nom === 'foo')
  t.deepEqual(pick(v1, 'nom', 'commune', 'positions'), pick(toponyme1, 'nom', 'commune', 'positions'))
  t.true(v1._id.equals(_idToponyme1))

  const v2 = voies.find(v => v.nom === 'bar')
  t.deepEqual(pick(v2, 'nom', 'commune', 'positions'), pick(toponyme2, 'nom', 'commune', 'positions'))
  t.true(v2._id.equals(_idToponyme2))
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
  const _idToponyme = new mongo.ObjectID()
  const _idNumero = new mongo.ObjectID()
  const referenceDate = new Date('2021-01-01')

  await mongo.db.collection('bases_locales').insertOne({
    _id: _idBal,
    _updated: referenceDate
  })
  await mongo.db.collection('toponymes').insertOne({
    _id: _idToponyme,
    _bal: _idBal,
    nom: 'foo',
    commune: '12345'
  })
  await mongo.db.collection('numeros').insertOne({
    _id: _idNumero,
    _bal: _idBal,
    commune: '12345',
    toponyme: _idToponyme,
    numero: 42,
    suffixe: 'foo',
    positions: [],
    _created: referenceDate,
    _updated: referenceDate
  })

  await Toponyme.remove(_idToponyme)

  t.falsy(await mongo.db.collection('toponymes').findOne({_id: _idToponyme}))

  const numero = await mongo.db.collection('numeros').findOne({_id: _idNumero})
  t.truthy(numero)
  t.falsy(numero.toponyme)

  const bal = await mongo.db.collection('bases_locales').findOne({_id: _idBal})
  t.notDeepEqual(bal._updated, referenceDate)
})
