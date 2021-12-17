const test = require('ava')
const {MongoMemoryServer} = require('mongodb-memory-server')
const mongo = require('../../util/mongo')
const Numero = require('../numero')

let mongod

test.before('start server', async () => {
  mongod = await MongoMemoryServer.create()
  await mongo.connect(mongod.getUri())
})

test.after.always('cleanup', async () => {
  await mongo.disconnect()
  await mongod.stop()
})

test('create a numero', async t => {
  const idBal = new mongo.ObjectId()
  const _id = new mongo.ObjectId()
  const referenceDate = new Date('2019-01-01')

  await mongo.db.collection('bases_locales').insertOne({
    _id: idBal,
    _updated: referenceDate
  })
  await mongo.db.collection('voies').insertOne({
    _id,
    _bal: idBal,
    _updated: referenceDate
  })
  const numero = await Numero.create(_id, {
    numero: 42,
    suffixe: 'foo',
    comment: 'bar',
    positions: []
  })

  const keys = ['_id', '_bal', 'commune', '_updated', '_created', 'voie', 'numero', 'suffixe', 'comment', 'toponyme', 'positions', 'parcelles', 'certifie']
  t.true(keys.every(k => k in numero))
  t.is(Object.keys(numero).length, keys.length)

  const bal = await mongo.db.collection('bases_locales').findOne({_id: idBal})
  t.deepEqual(numero._created, bal._updated)

  const voie = await mongo.db.collection('voies').findOne({_id})
  t.deepEqual(numero._created, voie._updated)
})

test('create a numero / invalid numero type', t => {
  const idVoie = new mongo.ObjectId()
  return t.throwsAsync(Numero.create(idVoie, {
    numero: '042',
    suffixe: 'foo',
    positions: []
  }), {message: 'Invalid payload'})
})

test('create a numero / minimal', async t => {
  const _id = new mongo.ObjectId()
  await mongo.db.collection('voies').insertOne({_id})
  const numero = await Numero.create(_id, {numero: 42})

  const keys = ['_id', '_bal', 'commune', '_updated', '_created', 'voie', 'numero', 'suffixe', 'positions', 'comment', 'toponyme', 'parcelles', 'certifie']
  t.true(keys.every(k => k in numero))
  t.is(Object.keys(numero).length, keys.length)
})

test('create a numero with uppercase suffixe', async t => {
  const _id = new mongo.ObjectId()
  await mongo.db.collection('voies').insertOne({_id})
  const numero = await Numero.create(_id, {numero: 42, suffixe: 'FOO'})

  t.is(numero.suffixe, 'foo')
})

test('create a numero with toponyme', async t => {
  const _idBal = new mongo.ObjectId()
  const _idVoie = new mongo.ObjectId()
  const _idToponyme = new mongo.ObjectId()

  await mongo.db.collection('voies').insertOne({_id: _idVoie})
  await mongo.db.collection('toponymes').insertOne({
    _id: _idToponyme,
    _bal: _idBal,
    nom: 'foo',
    commune: '12345'
  })
  const numero = await Numero.create(_idVoie, {numero: 42, toponyme: _idToponyme.toString()})

  t.deepEqual(numero.toponyme, _idToponyme)
})

test('create a numero with parcelles', async t => {
  const _id = new mongo.ObjectId()
  await mongo.db.collection('voies').insertOne({_id})
  const numero = await Numero.create(
    _id,
    {numero: 42, parcelles: ['12345000AA0001', '12345000AA0002']}
  )

  t.deepEqual(numero.parcelles, ['12345000AA0001', '12345000AA0002'])
})

test('create a numero with parcelles / lowercase', async t => {
  const _id = new mongo.ObjectId()
  await mongo.db.collection('voies').insertOne({_id})
  const error = await t.throwsAsync(() => Numero.create(_id, {numero: 42, parcelles: ['12345000aa0001']}))

  t.deepEqual(error.validation, {
    parcelles: ['"parcelles[0]" with value "12345000aa0001" fails to match the required pattern: /^[A-Z\\d]+$/']
  })

  t.is(error.message, 'Invalid payload')
})

test('create a numero with parcelles / less than 14 characters', async t => {
  const _id = new mongo.ObjectId()
  const parcelles = ['12345000AA']
  await mongo.db.collection('voies').insertOne({_id})
  const error = await t.throwsAsync(() => Numero.create(_id, {numero: 42, parcelles}))

  t.deepEqual(error.validation, {
    parcelles: ['"parcelles[0]" length must be 14 characters long']
  })

  t.is(error.message, 'Invalid payload')
})

test('create a numero / voie do not exists', t => {
  const _id = new mongo.ObjectId()
  return t.throwsAsync(Numero.create(_id, {numero: 42}, {message: 'Voie not found'}))
})

test('create a numero with certifie true', async t => {
  const _id = new mongo.ObjectId()
  await mongo.db.collection('voies').insertOne({_id})
  const numero = await Numero.create(_id, {numero: 42, certifie: true})

  t.is(numero.certifie, true)
})

test('create a numero with certifie false', async t => {
  const _id = new mongo.ObjectId()
  await mongo.db.collection('voies').insertOne({_id})
  const numero = await Numero.create(_id, {numero: 42, certifie: false})

  t.is(numero.certifie, false)
})

test('importMany', async t => {
  const idBal = new mongo.ObjectId()
  const idVoie = new mongo.ObjectId()

  const numero1 = {voie: idVoie, numero: 42, commune: '12345', _created: new Date('2019-01-01'), _updated: new Date('2019-01-05')}
  const numero2 = {voie: idVoie, numero: 24, commune: '12345'}
  const numero3 = {
    voie: idVoie,
    numero: 55,
    commune: '55500',
    positions: [
      {
        type: 'entrée',
        point:
        {
          type: 'point',
          coordinates: [5.25237, 48.668935]
        }
      }
    ],
    parcelles: ['55326000AA0039', '55326000AA0116', '55326000AA0035'],
    certifie: true
  }

  await Numero.importMany(idBal, [numero1, numero2, numero3], {validate: false})

  const numeros = await mongo.db.collection('numeros').find({_bal: idBal, voie: idVoie}).toArray()

  t.is(numeros.length, 3)
  t.true(numeros.some(n => n.numero === 24))
  t.true(numeros.some(n => n.numero === 42))

  const n42 = numeros.find(n => n.numero === 42)
  t.deepEqual(n42._created, new Date('2019-01-01'))
  t.deepEqual(n42._updated, new Date('2019-01-05'))
  t.deepEqual(n42.parcelles, [])
  t.is(n42.parcelles.length, 0)
  t.falsy(n42.certifie)

  const n55 = numeros.find(n => n.numero === 55)
  t.is(n55.parcelles.length, 3)
  t.true(n55.certifie)
})

test('update a numero', async t => {
  const idBal = new mongo.ObjectId()
  const idVoie = new mongo.ObjectId()
  const _id = new mongo.ObjectId()
  const referenceDate = new Date('2019-01-01')

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
    _id,
    _bal: idBal,
    commune: '12345',
    voie: idVoie,
    numero: 42,
    suffixe: 'foo',
    positions: [],
    _created: referenceDate,
    _updated: referenceDate
  })

  const numero = await Numero.update(_id, {
    numero: 24,
    suffixe: 'BAR',
    comment: 'Commentaire de numéro 123 !',
    positions: [{
      point: {type: 'Point', coordinates: [0, 0]},
      source: 'source',
      type: 'entrée'
    }],
    certifie: true
  })

  t.is(numero.numero, 24)
  t.is(numero.suffixe, 'bar')
  t.is(numero.comment, 'Commentaire de numéro 123 !')
  t.is(numero.positions.length, 1)
  t.is(numero.certifie, true)
  t.is(Object.keys(numero).length, 12)
  t.deepEqual(numero.parcelles, [])
  t.deepEqual(numero.voie, idVoie)

  const bal = await mongo.db.collection('bases_locales').findOne({_id: idBal})
  t.notDeepEqual(numero._created, bal._updated)
})

test('update a numero / voie null', async t => {
  const idBal = new mongo.ObjectId()
  const idVoie = new mongo.ObjectId()
  const _id = new mongo.ObjectId()

  await mongo.db.collection('bases_locales').insertOne({
    _id: idBal
  })
  await mongo.db.collection('voies').insertOne({
    _id: idVoie,
    _bal: idBal,
    commune: '12345'
  })
  await mongo.db.collection('numeros').insertOne({
    _id,
    _bal: idBal,
    commune: '12345',
    voie: idVoie,
    numero: 42,
    suffixe: 'foo',
    positions: []
  })

  return t.throwsAsync(() => Numero.update(_id, {voie: null}), {message: 'Invalid payload'})
})

test('update a numero / no suffixe', async t => {
  const idBal = new mongo.ObjectId()
  const idVoie = new mongo.ObjectId()
  const _id = new mongo.ObjectId()
  const referenceDate = new mongo.ObjectId()

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
    _id,
    _bal: idBal,
    commune: '12345',
    voie: idVoie,
    numero: 42,
    suffixe: 'foo'
  })

  const numero = await Numero.update(_id, {
    numero: 24
  })

  t.is(numero.numero, 24)
  t.is(numero.suffixe, 'foo')
})

test('update a numero / without suffixe', async t => {
  const idBal = new mongo.ObjectId()
  const idVoie = new mongo.ObjectId()
  const _id = new mongo.ObjectId()
  const referenceDate = new mongo.ObjectId()

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
    _id,
    _bal: idBal,
    commune: '12345',
    voie: idVoie,
    numero: 42
  })

  const numero = await Numero.update(_id, {
    numero: 24
  })

  t.is(numero.numero, 24)
  t.is(numero.suffixe, undefined)
})

test('update a numero / change voie', async t => {
  const idBal = new mongo.ObjectId()
  const idVoieA = new mongo.ObjectId()
  const idVoieB = new mongo.ObjectId()
  const _id = new mongo.ObjectId()
  const referenceDate = new Date('2019-01-01')

  await mongo.db.collection('bases_locales').insertOne({
    _id: idBal,
    _updated: referenceDate
  })
  await mongo.db.collection('voies').insertMany([{
    _id: idVoieA,
    _bal: idBal,
    commune: '12345',
    _updated: referenceDate
  }, {
    _id: idVoieB,
    _bal: idBal,
    commune: '12345',
    _updated: referenceDate
  }])
  await mongo.db.collection('numeros').insertOne({
    _id,
    _bal: idBal,
    commune: '12345',
    voie: idVoieA,
    numero: 42,
    suffixe: 'foo',
    positions: [],
    _created: referenceDate,
    _updated: referenceDate
  })

  const numero = await Numero.update(_id, {
    numero: 24,
    voie: idVoieB.toString(),
    suffixe: 'BAR',
    comment: 'Commentaire de numéro 123 !',
    positions: [{
      point: {type: 'Point', coordinates: [0, 0]},
      source: 'source',
      type: 'entrée'
    }],
    certifie: false
  })

  t.is(numero.numero, 24)
  t.is(numero.suffixe, 'bar')
  t.is(numero.comment, 'Commentaire de numéro 123 !')
  t.is(numero.positions.length, 1)
  t.is(Object.keys(numero).length, 12)

  t.deepEqual(numero.voie, idVoieB)
})

test('update a numero / add toponyme', async t => {
  const idBal = new mongo.ObjectId()
  const idVoie = new mongo.ObjectId()
  const idToponyme = new mongo.ObjectId()
  const _id = new mongo.ObjectId()
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
  await mongo.db.collection('toponymes').insertOne({
    _id: idToponyme,
    _bal: idBal,
    nom: 'foo',
    commune: '12345'
  })
  await mongo.db.collection('numeros').insertOne({
    _id,
    _bal: idBal,
    commune: '12345',
    voie: idVoie,
    numero: 42,
    positions: [],
    _created: referenceDate,
    _updated: referenceDate
  })

  const numero = await Numero.update(_id, {
    numero: 24,
    voie: idVoie.toString(),
    toponyme: idToponyme.toString(),
    positions: [{
      point: {type: 'Point', coordinates: [0, 0]},
      source: 'source',
      type: 'entrée'
    }],
    certifie: false
  })

  t.is(numero.numero, 24)
  t.is(numero.positions.length, 1)
  t.is(Object.keys(numero).length, 11)
  t.deepEqual(numero.toponyme, idToponyme)
})

test('update a numero / change toponyme', async t => {
  const idBal = new mongo.ObjectId()
  const idVoie = new mongo.ObjectId()
  const idToponymeA = new mongo.ObjectId()
  const idToponymeB = new mongo.ObjectId()
  const _id = new mongo.ObjectId()
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
  await mongo.db.collection('toponymes').insertMany([{
    _id: idToponymeA,
    _bal: idBal,
    nom: 'foo',
    commune: '12345'
  }, {
    _id: idToponymeB,
    _bal: idBal,
    nom: 'foo',
    commune: '12345'
  }])
  await mongo.db.collection('numeros').insertOne({
    _id,
    _bal: idBal,
    commune: '12345',
    voie: idVoie,
    numero: 42,
    toponyme: idToponymeA.toString(),
    positions: [],
    certifie: false,
    _created: referenceDate,
    _updated: referenceDate
  })

  const numero = await Numero.update(_id, {
    numero: 42,
    voie: idVoie.toString(),
    toponyme: idToponymeB.toString(),
    positions: [{
      point: {type: 'Point', coordinates: [0, 0]},
      source: 'source',
      type: 'entrée'
    }]
  })

  t.is(numero.numero, 42)
  t.is(numero.positions.length, 1)
  t.is(Object.keys(numero).length, 11)
  t.deepEqual(numero.toponyme, idToponymeB)
})

test('update a numero / not found', t => {
  const _id = new mongo.ObjectId()
  return t.throwsAsync(() => Numero.update(_id, {numero: 42}), {message: 'Numero not found'})
})

test('delete a numero', async t => {
  const idBal = new mongo.ObjectId()
  const idVoie = new mongo.ObjectId()
  const _id = new mongo.ObjectId()
  const referenceDate = new Date('2019-01-01')

  await mongo.db.collection('bases_locales').insertOne({
    _id: idBal,
    _updated: referenceDate
  })
  await mongo.db.collection('voies').insertOne({
    _bal: idBal,
    _id: idVoie,
    commune: '12345',
    _updated: referenceDate
  })
  await mongo.db.collection('numeros').insertOne({
    _bal: idBal,
    voie: idVoie,
    _id,
    commune: '12345',
    numero: 42,
    suffixe: 'foo',
    positions: [],
    _created: referenceDate,
    _updated: referenceDate
  })

  await Numero.remove(_id)

  const numero = await mongo.db.collection('numeros').findOne({_id})
  t.falsy(numero)

  const bal = await mongo.db.collection('bases_locales').findOne({_id: idBal})
  t.notDeepEqual(referenceDate, bal._updated)

  const voie = await mongo.db.collection('voies').findOne({_id: idVoie})
  t.notDeepEqual(referenceDate, voie._updated)
})

test('batch numeros', async t => {
  const idBal = new mongo.ObjectId()
  const idVoieA = new mongo.ObjectId()
  const idVoieB = new mongo.ObjectId()
  const idNumeroA = new mongo.ObjectId()
  const idNumeroB = new mongo.ObjectId()
  const referenceDate = new Date('2021-01-01')

  await mongo.db.collection('bases_locales').insertOne({
    _id: idBal,
    _updated: referenceDate
  })
  await mongo.db.collection('voies').insertOne({
    _id: idVoieA,
    _bal: idBal,
    commune: '12345',
    _updated: referenceDate
  })
  await mongo.db.collection('voies').insertOne({
    _id: idVoieB,
    _bal: idBal,
    commune: '12345',
    _updated: referenceDate
  })
  await mongo.db.collection('numeros').insertOne({
    _id: idNumeroA,
    _bal: idBal,
    commune: '12345',
    voie: idVoieA,
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
    voie: idVoieB,
    numero: 42,
    positions: [],
    certifie: true,
    _created: referenceDate,
    _updated: referenceDate
  })

  await Numero.batchUpdateNumeros(idBal, {
    numeros: [idNumeroA, idNumeroB],
    certifie: true
  })

  const baseLocale = await mongo.db.collection('bases_locales').find({_id: idBal})
  t.notDeepEqual(baseLocale._updated, referenceDate)

  const voies = await mongo.db.collection('voies').find({_bal: idBal}).toArray()
  t.notDeepEqual(voies[0]._updated, referenceDate)
  t.deepEqual(voies[1]._updated, referenceDate)

  const numeros = await mongo.db.collection('numeros').find({_bal: idBal}).toArray()
  t.is(numeros[0].certifie, true)
  t.is(numeros[1].certifie, true)
  t.notDeepEqual(numeros[0]._updated, referenceDate)
  t.deepEqual(numeros[1]._updated, referenceDate)
})

test('batch numeros / invalid certifie value', async t => {
  const idBal = new mongo.ObjectId()

  const error = await t.throwsAsync(() => Numero.batchUpdateNumeros(idBal, {
    numeros: [],
    certifie: 'foo'
  }))

  t.deepEqual(error.validation, {
    certifie: ['"certifie" must be a boolean']
  })
})
