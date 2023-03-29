const test = require('ava')
const {MongoMemoryServer} = require('mongodb-memory-server')
const {pick} = require('lodash')
const mongo = require('../../util/mongo')
const Voie = require('../voie')

let mongod

test.before('start server', async () => {
  mongod = await MongoMemoryServer.create()
  await mongo.connect(mongod.getUri())
})

test.after.always('cleanup', async () => {
  await mongo.disconnect()
  await mongod.stop()
})

test('create a Voie', async t => {
  const _id = new mongo.ObjectId()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    _updated: new Date('2019-01-01')
  })
  const baseLocale = {
    _id,
    commune: '12345'
  }
  const voie = await Voie.create(baseLocale, {nom: 'foo  oo', nomAlt: {bre: '  ba   r   '}})

  t.truthy(voie._id)
  t.is(voie._bal, baseLocale._id)
  t.is(voie.commune, baseLocale.commune)
  t.is(voie.nom, 'foo oo')
  t.is(voie.typeNumerotation, 'numerique')
  t.is(voie.trace, null)
  t.deepEqual(voie.nomAlt, {bre: 'ba r'})
  t.truthy(voie._created)
  t.truthy(voie._updated)

  t.is(Object.keys(voie).length, 10)

  const bal = await mongo.db.collection('bases_locales').findOne({_id})
  t.deepEqual(voie._created, bal._updated)
})

test('create a Voie / with unsupported nomAlt', async t => {
  const _id = new mongo.ObjectId()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
  })
  const baseLocale = {
    _id,
    commune: '97125'
  }
  const error = await t.throwsAsync(() => Voie.create(baseLocale, {nom: 'foo  oo', nomAlt: {gua: 'Lapwent', gyn: 'Lapwent'}}))

  t.deepEqual(error.validation, {
    nomAlt: [
      'Le code langue régionale gua n’est pas supporté',
      'Le code langue régionale gyn n’est pas supporté'
    ]
  })
})

test('importMany', async t => {
  const _idBal = new mongo.ObjectId()
  const voie1 = {
    _bal: _idBal,
    nom: 'foo',
    commune: '12345',
    nomAlt: {gcf: 'foo gcf'},
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-05')
  }
  const voie2 = {
    _bal: _idBal,
    nom: 'bar',
    commune: '23456',
    nomAlt: {bre: 'bar bre'}
  }

  await Voie.importMany(_idBal, [voie1, voie2], {validate: false})
  const voies = await mongo.db.collection('voies').find({_bal: _idBal}).toArray()
  t.is(voies.length, 2)
  const v1 = voies.find(v => v.nom === 'foo')
  t.deepEqual(
    pick(v1, 'nom', 'commune', 'nomAlt', '_updated', '_created'),
    pick(voie1, 'nom', 'commune', 'nomAlt', '_updated', '_created')
  )
  const v2 = voies.find(v => v.nom === 'bar')
  t.deepEqual(
    pick(v2, 'nom', 'commune', 'nomAlt'),
    pick(voie2, 'nom', 'commune', 'nomAlt')
  )
})

test('importMany / keeping ids', async t => {
  const _idBal = new mongo.ObjectId()
  const _idVoie1 = new mongo.ObjectId()
  const _idVoie2 = new mongo.ObjectId()
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
  const _idBal = new mongo.ObjectId()
  const _id = new mongo.ObjectId()

  await mongo.db.collection('bases_locales').insertOne({
    _id: _idBal,
    _updated: new Date('2019-01-01')
  })
  await mongo.db.collection('voies').insertOne({
    _id,
    _bal: _idBal,
    nom: 'foo',
    commune: '97125'
  })

  const voie = await Voie.update(_id, {
    nom: 'la Pointe des Châteaux',
    nomAlt: {
      gcf: 'Lapwent'
    }
  })

  t.is(voie.nom, 'la Pointe des Châteaux')
  t.deepEqual(voie.nomAlt, {gcf: 'Lapwent'})

  const bal = await mongo.db.collection('bases_locales').findOne({_id: _idBal})
  t.deepEqual(bal._updated, voie._updated)
})

test('update a Voie / with unsupported nomAlt', async t => {
  const _idBal = new mongo.ObjectId()
  const _id = new mongo.ObjectId()

  await mongo.db.collection('bases_locales').insertOne({
    _id: _idBal
  })
  await mongo.db.collection('voies').insertOne({
    _id,
    _bal: _idBal,
    nom: 'foo',
    commune: '97125'
  })

  const error = await t.throwsAsync(() => Voie.update(_id, {
    nomAlt: {
      gua: 'Lapwent',
      gcf: 'Lapwent'
    }
  }))

  t.deepEqual(error.validation, {
    nomAlt: ['Le code langue régionale gua n’est pas supporté']
  })
})

test('update a Voie / not found', t => {
  const _id = new mongo.ObjectId()
  return t.throwsAsync(() => Voie.update(_id, {nom: 'bar'}), {message: 'Voie not found'})
})

test('remove a Voie', async t => {
  const _idBal = new mongo.ObjectId()
  const _id = new mongo.ObjectId()
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
  const idBal = new mongo.ObjectId()
  const idVoie = new mongo.ObjectId()
  const idNumeroA = new mongo.ObjectId()
  const idNumeroB = new mongo.ObjectId()
  const idNumeroC = new mongo.ObjectId()
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
  const idVoie = new mongo.ObjectId()

  const error = await t.throwsAsync(() => Voie.batchUpdateNumeros(idVoie, {certifie: 'foo'}))

  t.deepEqual(error.validation, {
    certifie: ['Le champ certifie doit être de type "boolean"']
  })
})

test('Convert voie to toponyme', async t => {
  const idSourceBAL = new mongo.ObjectId()
  // CREATE BAL
  await mongo.db.collection('bases_locales').insertOne({
    _id: idSourceBAL,
    _updated: new Date('2019-01-01'),
    commune: '27115',
  })
  // CREATE VOIE
  const idVoie = new mongo.ObjectId()
  await mongo.db.collection('voies').insertOne({
    _id: idVoie,
    _bal: idSourceBAL,
    commune: '27115',
    nom: 'Voie To Toponyme',
    nomAlt: {bre: 'brasil'},
    trace: {type: 'LineString', coordinates: []},
    typeNumerotation: 'metrique',
  })
  // RUN CONVERT TO TOPONYME
  await Voie.convertToToponyme(idVoie)
  // CHECK TOPONYME WAS CREATED
  const toponyme = await mongo.db.collection('toponymes').findOne({_bal: idSourceBAL})
  t.is(toponyme.nom, 'Voie To Toponyme')
  t.deepEqual(toponyme.nomAlt, {bre: 'brasil'})
  t.is(toponyme.commune, '27115')
  t.deepEqual(toponyme.positions, [])
  t.deepEqual(toponyme.parcelles, [])
  const voieExist = await mongo.db.collection('voies').findOne({_bal: idSourceBAL})
  t.is(voieExist, null)
})

test('Convert voie to toponyme fail voie', async t => {
  const error = await t.throwsAsync(() =>
    Voie.convertToToponyme('xxxx')
  )
  t.is(error.message, 'Voie not found')
})

test('Convert voie to toponyme fail numero', async t => {
  // CREATE VOIE
  const idVoie = new mongo.ObjectId()
  await mongo.db.collection('voies').insertOne({
    _id: idVoie,
  })
  // CREATE NUMERO
  await mongo.db.collection('numeros').insertOne({
    numero: 1,
    voie: idVoie,
  })
  const error = await t.throwsAsync(() =>
    Voie.convertToToponyme(idVoie)
  )
  t.is(error.message, 'Voie has numero(s)')
})

