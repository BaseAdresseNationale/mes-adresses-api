const test = require('ava')
const {MongoMemoryServer} = require('mongodb-memory-server')
const {pick} = require('lodash')
const mongo = require('../../util/mongo')
const Voie = require('../voie')

const mongod = new MongoMemoryServer()

test.before('start server', async () => {
  await mongo.connect(await mongod.getUri())
})

test.after.always('cleanup', async () => {
  await mongo.disconnect()
  await mongod.stop()
})

test('create a Voie', async t => {
  const _id = new mongo.ObjectID()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    _updated: new Date('2019-01-01')
  })
  const voie = await Voie.create(_id, '12345', {nom: 'foo  oo'})

  t.truthy(voie._id)
  t.is(voie._bal, _id)
  t.is(voie.commune, '12345')
  t.is(voie.nom, 'foo oo')
  t.is(voie.typeNumerotation, 'numerique')
  t.is(voie.trace, null)
  t.truthy(voie._created)
  t.truthy(voie._updated)

  t.is(Object.keys(voie).length, 9)

  const bal = await mongo.db.collection('bases_locales').findOne({_id})
  t.deepEqual(voie._created, bal._updated)
})

test('importMany', async t => {
  const _idBal = new mongo.ObjectID()
  const voie1 = {
    _bal: _idBal,
    nom: 'foo',
    commune: '12345',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-05')
  }
  const voie2 = {
    _bal: _idBal,
    nom: 'bar',
    commune: '23456'
  }
  Voie.importMany(_idBal, [voie1, voie2], {validate: false})
  const voies = await mongo.db.collection('voies').find({_bal: _idBal}).toArray()
  t.is(voies.length, 2)
  const v1 = voies.find(v => v.nom === 'foo')
  t.deepEqual(
    pick(v1, 'nom', 'commune', '_updated', '_created'),
    pick(voie1, 'nom', 'commune', '_updated', '_created')
  )
  const v2 = voies.find(v => v.nom === 'bar')
  t.deepEqual(
    pick(v2, 'nom', 'commune'),
    pick(voie2, 'nom', 'commune')
  )
})

test('importMany / keeping ids', async t => {
  const _idBal = new mongo.ObjectID()
  const _idVoie1 = new mongo.ObjectID()
  const _idVoie2 = new mongo.ObjectID()
  const voie1 = {
    _id: _idVoie1,
    _bal: _idBal,
    nom: 'foo',
    commune: '12345'
  }
  const voie2 = {
    _id: _idVoie2,
    _bal: _idBal,
    nom: 'bar',
    commune: '23456'
  }
  Voie.importMany(_idBal, [voie1, voie2], {validate: false, keepIds: true})
  const voies = await mongo.db.collection('voies').find({_bal: _idBal}).toArray()
  t.is(voies.length, 2)
  const v1 = voies.find(v => v.nom === 'foo')
  t.deepEqual(pick(v1, 'nom', 'commune'), pick(voie1, 'nom', 'commune'))
  t.true(v1._id.equals(_idVoie1))
  const v2 = voies.find(v => v.nom === 'bar')
  t.deepEqual(pick(v2, 'nom', 'commune'), pick(voie2, 'nom', 'commune'))
  t.true(v2._id.equals(_idVoie2))
})

test('update a Voie', async t => {
  const _idBal = new mongo.ObjectID()
  const _id = new mongo.ObjectID()

  await mongo.db.collection('bases_locales').insertOne({
    _id: _idBal,
    _updated: new Date('2019-01-01')
  })
  await mongo.db.collection('voies').insertOne({
    _id,
    _bal: _idBal,
    nom: 'foo',
    commune: '12345'
  })

  const voie = await Voie.update(_id, {
    nom: 'bar'
  })

  t.is(voie.nom, 'bar')

  const bal = await mongo.db.collection('bases_locales').findOne({_id: _idBal})
  t.deepEqual(bal._updated, voie._updated)
})

test('update a Voie / not found', t => {
  const _id = new mongo.ObjectID()
  return t.throwsAsync(() => Voie.update(_id, {nom: 'bar'}), {message: 'Voie not found'})
})

test('remove a Voie', async t => {
  const _idBal = new mongo.ObjectID()
  const _id = new mongo.ObjectID()
  const referenceDate = new Date('2019-01-01')

  await mongo.db.collection('bases_locales').insertOne({
    _id: _idBal,
    _updated: referenceDate
  })
  await mongo.db.collection('voies').insertOne({
    _id,
    _bal: _idBal,
    nom: 'foo'
  })
  await mongo.db.collection('numeros').insertOne({
    _bal: _idBal,
    voie: _id,
    numero: 1
  })

  await Voie.remove(_id)

  t.falsy(await mongo.db.collection('voies').findOne({_id}))
  t.falsy(await mongo.db.collection('numeros').findOne({voie: _id}))

  const bal = await mongo.db.collection('bases_locales').findOne({_id: _idBal})
  t.notDeepEqual(bal._updated, referenceDate)
})

test('batch voie numeros', async t => {
  const idBal = new mongo.ObjectID()
  const idVoie = new mongo.ObjectID()
  const idNumeroA = new mongo.ObjectID()
  const idNumeroB = new mongo.ObjectID()
  const idNumeroC = new mongo.ObjectID()
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
  await mongo.db.collection('numeros').insertOne({
    _id: idNumeroA,
    _bal: idBal,
    commune: '12345',
    voie: idVoie,
    numero: 21,
    positions: [],
    certifie: false,
    _created: referenceDate,
    _updated: referenceDate
  })
  await mongo.db.collection('numeros').insertOne({
    _id: idNumeroB,
    _bal: idBal,
    commune: '12345',
    voie: idVoie,
    numero: 42,
    positions: [],
    certifie: false,
    _created: referenceDate,
    _updated: referenceDate
  })
  await mongo.db.collection('numeros').insertOne({
    _id: idNumeroC,
    _bal: idBal,
    commune: '12345',
    voie: idVoie,
    numero: 55,
    positions: [],
    certifie: true,
    _created: referenceDate,
    _updated: referenceDate
  })

  await Voie.batchUpdateNumeros(idVoie, {certifie: true})

  const baseLocal = await mongo.db.collection('bases_locales').find({_id: idBal})
  t.notDeepEqual(baseLocal._update, referenceDate)

  const voie = await mongo.db.collection('voies').find({_id: idVoie})
  t.notDeepEqual(voie._update, referenceDate)

  const numeros = await mongo.db.collection('numeros').find({_bal: idBal, voie: idVoie}).toArray()
  t.is(numeros[0].certifie, true)
  t.is(numeros[1].certifie, true)
  t.is(numeros[2].certifie, true)
  t.notDeepEqual(numeros[0]._updated, referenceDate)
  t.notDeepEqual(numeros[1]._updated, referenceDate)
  t.deepEqual(numeros[2]._updated, referenceDate)
})

test('batch voie numeros / invalid certifie', async t => {
  const idVoie = new mongo.ObjectID()

  const error = await t.throwsAsync(() => Voie.batchUpdateNumeros(idVoie, {certifie: 'foo'}))

  t.deepEqual(error.validation, {
    certifie: ['"certifie" must be a boolean']
  })
})
