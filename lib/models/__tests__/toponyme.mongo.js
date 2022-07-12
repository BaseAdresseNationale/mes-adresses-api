const test = require('ava')
const {MongoMemoryServer} = require('mongodb-memory-server')
const {pick} = require('lodash')
const mongo = require('../../util/mongo')
const Toponyme = require('../toponyme')

let mongod

test.before('start server', async () => {
  mongod = await MongoMemoryServer.create()
  await mongo.connect(mongod.getUri())
})

test.after.always('cleanup', async () => {
  await mongo.disconnect()
  await mongod.stop()
})

test('create a Toponyme', async t => {
  const _id = new mongo.ObjectId()

  await mongo.db.collection('bases_locales').insertOne({
    _id,
    _updated: new Date('2021-01-01')
  })

  const toponyme = await Toponyme.create(_id, {nom: 'foo'})

  const keys = ['_id', '_bal', 'nom', 'positions', 'parcelles', 'commune', 'nomAlt', '_created', '_updated']
  t.true(keys.every(k => k in toponyme))
  t.is(Object.keys(toponyme).length, keys.length)
  t.is(toponyme.nomAlt, null)

  const bal = await mongo.db.collection('bases_locales').findOne({_id})
  t.deepEqual(toponyme._created, bal._updated)
})

test('create a Toponyme / with unsupported nomAlt', async t => {
  const _id = new mongo.ObjectId()

  await mongo.db.collection('bases_locales').insertOne({
    _id,
  })

  const toponyme = await Toponyme.create(_id, {nom: 'foo', nomAlt: {gua: 'Lapwent'}})
  t.is(toponyme.nomAlt, null)
})

test('create a Toponyme / with positions & parcelles', async t => {
  const _id = new mongo.ObjectId()

  await mongo.db.collection('bases_locales').insertOne({_id})

  const position = {
    point: {type: 'Point', coordinates: [0, 0]},
    source: 'foo',
    type: 'entrée'
  }
  const toponyme = await Toponyme.create(_id, {
    nom: 'foo',
    parcelles: ['64284000BI0459', '64284000BI0450'],
    positions: [position]
  })

  t.deepEqual(toponyme.positions, [position])
  t.deepEqual(toponyme.parcelles, ['64284000BI0459', '64284000BI0450'])
})

test('importMany', async t => {
  const _idBal = new mongo.ObjectId()
  const toponyme1 = {
    _bal: _idBal,
    nom: 'foo',
    commune: '12345',
    nomAlt: {gyn: 'foo gyn'},
    positions: [],
    parcelles: [],
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-05')
  }
  const toponyme2 = {
    _bal: _idBal,
    nom: 'bar',
    commune: '23456',
    nomAlt: {bre: 'bar bre'},
    positions: [],
    parcelles: []
  }

  Toponyme.importMany(_idBal, [toponyme1, toponyme2], {validate: false})
  const toponymes = await mongo.db.collection('toponymes').find({_bal: _idBal}).toArray()
  t.is(toponymes.length, 2)

  const v1 = toponymes.find(v => v.nom === 'foo')
  t.deepEqual(
    pick(v1, 'nom', 'commune', 'nomAlt', 'positions', 'parcelles', '_updated', '_created'),
    pick(toponyme1, 'nom', 'commune', 'nomAlt', 'positions', 'parcelles', '_updated', '_created')
  )

  const v2 = toponymes.find(v => v.nom === 'bar')
  t.deepEqual(
    pick(v2, 'nom', 'commune', 'nomAlt', 'positions', 'parcelles'),
    pick(toponyme2, 'nom', 'commune', 'nomAlt', 'positions', 'parcelles')
  )
})

test('importMany / keeping ids', async t => {
  const _idBal = new mongo.ObjectId()
  const _idToponyme1 = new mongo.ObjectId()
  const _idToponyme2 = new mongo.ObjectId()
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
  const _idBal = new mongo.ObjectId()
  const _id = new mongo.ObjectId()

  await mongo.db.collection('bases_locales').insertOne({
    _id: _idBal,
    _updated: new Date('2021-01-01')
  })
  await mongo.db.collection('toponymes').insertOne({
    _id,
    _bal: _idBal,
    nom: 'foo',
    commune: '97125',
    parcelles: []
  })

  const toponyme = await Toponyme.update(_id, {
    nom: 'la Pointe des Châteaux',
    nomAlt: {
      gyn: 'Lapwent'
    },
    parcelles: ['64284000BI0459', '64284000BI0450'],
    positions: [{
      point: {type: 'Point', coordinates: [0, 0]},
      source: 'source',
      type: 'entrée'
    }]
  })

  t.is(toponyme.nom, 'la Pointe des Châteaux')
  t.is(toponyme.positions.length, 1)
  t.is(toponyme.parcelles.length, 2)
  t.deepEqual(toponyme.nomAlt, {gyn: 'Lapwent'})

  const bal = await mongo.db.collection('bases_locales').findOne({_id: _idBal})
  t.deepEqual(bal._updated, toponyme._updated)
})

test('update a Toponyme / with unsupported nomAlt', async t => {
  const _idBal = new mongo.ObjectId()
  const _id = new mongo.ObjectId()

  await mongo.db.collection('bases_locales').insertOne({
    _id: _idBal
  })
  await mongo.db.collection('toponymes').insertOne({
    _id,
    _bal: _idBal,
    nom: 'foo',
    commune: '97125',
    parcelles: []
  })

  const toponyme = await Toponyme.update(_id, {
    nomAlt: {
      gua: 'Lapwent'
    }
  })

  t.is(toponyme.nomAlt, null)
})

test('update a Toponyme with invalid parcelles', async t => {
  const _idBal = new mongo.ObjectId()
  const _id = new mongo.ObjectId()

  await mongo.db.collection('bases_locales').insertOne({
    _id: _idBal,
    _updated: new Date('2021-01-01')
  })
  await mongo.db.collection('toponymes').insertOne({
    _id,
    _bal: _idBal,
    nom: 'foo',
    commune: '12345',
    positions: [{
      point: {type: 'Point', coordinates: [0, 0]},
      source: 'source',
      type: 'entrée'
    }],
    parcelles: []
  })

  return t.throwsAsync(() => Toponyme.update(_id, {parcelles: ['AA284000BI0', 'ZZ284000BI']}, {message: 'Invalid payload'}))
})

test('create a Toponyme / base locale do not exists', t => {
  const _id = new mongo.ObjectId()
  return t.throwsAsync(Toponyme.create(_id, '12345', {nom: 'toponyme'}, {message: 'Base locale not found'}))
})

test('update a Toponyme / not found', t => {
  const _id = new mongo.ObjectId()
  return t.throwsAsync(() => Toponyme.update(_id, {nom: 'bar'}), {message: 'Toponyme not found'})
})

test('remove a Toponyme', async t => {
  const _idBal = new mongo.ObjectId()
  const _idToponyme = new mongo.ObjectId()
  const _idNumero = new mongo.ObjectId()
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
    parcelles: [],
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
