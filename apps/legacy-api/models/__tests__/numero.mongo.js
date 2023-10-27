const {getLabel} = require('@ban-team/validateur-bal')
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

  const keys = ['_id', '_bal', 'commune', '_updated', '_created', 'voie', 'numero', 'suffixe', 'comment', 'toponyme', 'positions', 'parcelles', 'certifie', 'tiles']
  t.true(keys.every(k => k in numero))
  t.is(Object.keys(numero).length, keys.length)

  const bal = await mongo.db.collection('bases_locales').findOne({_id: idBal})
  t.deepEqual(numero._created, bal._updated)

  const voie = await mongo.db.collection('voies').findOne({_id})
  t.deepEqual(numero._created, voie._updated)
})

test('create a numero with position', async t => {
  const _id = new mongo.ObjectId()
  const referenceDate = new Date('2019-01-01')

  await mongo.db.collection('voies').insertOne({
    _id,
    _updated: referenceDate
  })
  const numero = await Numero.create(_id, {
    numero: 42,
    suffixe: 'foo',
    comment: 'bar',
    positions: [{
      source: 'inconnue',
      type: 'entrée',
      point: {type: 'Point', coordinates: [1, 1]}
    }]
  })

  const keys = ['_id', '_bal', 'commune', '_updated', '_created', 'voie', 'numero', 'suffixe', 'comment', 'toponyme', 'positions', 'parcelles', 'certifie', 'tiles']
  t.true(keys.every(k => k in numero))
  t.is(Object.keys(numero).length, keys.length)
  // CHECK TILE
  const tiles = [
    '13/4118/4073',
    '14/8237/8146',
    '15/16475/16292',
    '16/32950/32585',
    '17/65900/65171',
    '18/131800/130343',
    '19/263600/260687'
  ]
  t.deepEqual(numero.tiles, tiles)
  // CHECK VOIE
  const voie = await mongo.db.collection('voies').findOne({_id})
  t.deepEqual(numero._created, voie._updated)
  const centroid = {
    geometry: {
      coordinates: [1, 1],
      type: 'Point',
    },
    properties: {},
    type: 'Feature',
  }
  const centroidTiles = [
    '13/4118/4073',
    '14/8237/8146',
    '15/16475/16292',
    '16/32950/32585',
    '17/65900/65171',
    '18/131800/130343',
    '19/263600/260687'
  ]
  t.deepEqual(voie.centroid, centroid)
  t.deepEqual(voie.centroidTiles, centroidTiles)
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

  const keys = ['_id', '_bal', 'commune', '_updated', '_created', 'voie', 'numero', 'suffixe', 'positions', 'comment', 'toponyme', 'parcelles', 'certifie', 'tiles']
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
  await t.notThrowsAsync(() => Numero.create(_id, {numero: 42, parcelles: ['12345000aa0001']}))
})

test('create a numero with parcelles / less than 14 characters', async t => {
  const _id = new mongo.ObjectId()
  const parcelles = ['12345000AA']
  await mongo.db.collection('voies').insertOne({_id})
  const error = await t.throwsAsync(() => Numero.create(_id, {numero: 42, parcelles}))

  t.deepEqual(error.validation, {
    parcelles: [getLabel('cad_parcelles.valeur_invalide')]
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

test('create a numero / voie deleted', async t => {
  const _id = new mongo.ObjectId()
  await mongo.db.collection('voies').insertOne({_id, _deleted: new Date()})
  return t.throwsAsync(Numero.create(_id, {numero: 42}, {message: 'Voie not found'}))
})

test('create a numero / toponyme is deleted', async t => {
  const _idBal = new mongo.ObjectId()
  const _idVoie = new mongo.ObjectId()
  const _idToponyme = new mongo.ObjectId()

  await mongo.db.collection('voies').insertOne({_id: _idVoie})
  await mongo.db.collection('toponymes').insertOne({
    _id: _idToponyme,
    _bal: _idBal,
    nom: 'foo',
    commune: '12345',
    _deleted: new Date()
  })
  return t.throwsAsync(Numero.create(_idVoie, {numero: 42, toponyme: _idToponyme.toString()}), {message: 'Toponyme not found'})
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

test('importMany with position', async t => {
  const idBal = new mongo.ObjectId()
  const idVoie = new mongo.ObjectId()

  await mongo.db.collection('voies').insertOne({
    _id: idVoie,
  })

  const numeros = [{
    numero: 42,
    voie: idVoie,
    commune: '55500',
    suffixe: 'foo',
    comment: 'bar',
    positions: [{
      source: 'inconnue',
      type: 'entrée',
      point: {type: 'Point', coordinates: [1, 1]}
    }]
  }]

  await Numero.importMany(idBal, numeros, {validate: false})
  const numeroRes = await mongo.db.collection('numeros').findOne({voie: idVoie})
  const tiles = [
    '13/4118/4073',
    '14/8237/8146',
    '15/16475/16292',
    '16/32950/32585',
    '17/65900/65171',
    '18/131800/130343',
    '19/263600/260687'
  ]
  t.deepEqual(numeroRes.tiles, tiles)
  // CHECK VOIE
  const voie = await mongo.db.collection('voies').findOne({_id: idVoie})
  const centroid = {
    geometry: {
      coordinates: [1, 1],
      type: 'Point',
    },
    properties: {},
    type: 'Feature',
  }
  const centroidTiles = [
    '13/4118/4073',
    '14/8237/8146',
    '15/16475/16292',
    '16/32950/32585',
    '17/65900/65171',
    '18/131800/130343',
    '19/263600/260687'
  ]
  t.deepEqual(voie.centroid, centroid)
  t.deepEqual(voie.centroidTiles, centroidTiles)
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
  const numb = {
    _id,
    _bal: idBal,
    commune: '12345',
    voie: idVoie,
    numero: 42,
    suffixe: 'foo',
    positions: [],
    parcelles: [],
    _created: referenceDate,
    _updated: referenceDate
  }
  await mongo.db.collection('numeros').insertOne(numb)

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
  }, numb)

  t.is(numero.numero, 24)
  t.is(numero.suffixe, 'bar')
  t.is(numero.comment, 'Commentaire de numéro 123 !')
  t.is(numero.positions.length, 1)
  t.is(numero.certifie, true)
  t.is(Object.keys(numero).length, 13)
  t.deepEqual(numero.parcelles, [])
  t.deepEqual(numero.voie, idVoie)

  const bal = await mongo.db.collection('bases_locales').findOne({_id: idBal})
  t.notDeepEqual(numero._created, bal._updated)
})

test('update a numero with position', async t => {
  const idVoie = new mongo.ObjectId()
  const _id = new mongo.ObjectId()

  await mongo.db.collection('voies').insertOne({
    _id: idVoie,
    commune: '12345',
  })
  const numero = {
    _id,
    commune: '12345',
    voie: idVoie,
    numero: 42,
    suffixe: 'foo',
    positions: [],
  }
  await mongo.db.collection('numeros').insertOne(numero)

  await Numero.update(_id, {
    positions: [{
      source: 'inconnue',
      type: 'entrée',
      point: {type: 'Point', coordinates: [1, 1]}
    }]
  }, numero)

  const numeroRes = await mongo.db.collection('numeros').findOne({voie: idVoie})
  const tiles = [
    '13/4118/4073',
    '14/8237/8146',
    '15/16475/16292',
    '16/32950/32585',
    '17/65900/65171',
    '18/131800/130343',
    '19/263600/260687'
  ]
  t.deepEqual(numeroRes.tiles, tiles)
  // CHECK VOIE
  const voie = await mongo.db.collection('voies').findOne({_id: idVoie})
  const centroid = {
    geometry: {
      coordinates: [1, 1],
      type: 'Point',
    },
    properties: {},
    type: 'Feature',
  }
  const centroidTiles = [
    '13/4118/4073',
    '14/8237/8146',
    '15/16475/16292',
    '16/32950/32585',
    '17/65900/65171',
    '18/131800/130343',
    '19/263600/260687'
  ]
  t.deepEqual(voie.centroid, centroid)
  t.deepEqual(voie.centroidTiles, centroidTiles)
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

test('update a numero / voie deleted', async t => {
  const idBal = new mongo.ObjectId()
  const idVoie = new mongo.ObjectId()
  const _id = new mongo.ObjectId()

  await mongo.db.collection('bases_locales').insertOne({
    _id: idBal
  })
  await mongo.db.collection('voies').insertOne({
    _id: idVoie,
    _bal: idBal,
    commune: '12345',
    _deleted: new Date()
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

  return t.throwsAsync(() => Numero.update(_id, {voie: idVoie.toString(), numero: 24}), {message: 'Voie not found'})
})

test('update a numero / toponyme deleted', async t => {
  const idBal = new mongo.ObjectId()
  const idVoie = new mongo.ObjectId()
  const idToponyme = new mongo.ObjectId()
  const _id = new mongo.ObjectId()

  await mongo.db.collection('bases_locales').insertOne({
    _id: idBal
  })
  await mongo.db.collection('voies').insertOne({
    _id: idVoie,
    _bal: idBal,
    commune: '12345',
  })
  await mongo.db.collection('toponymes').insertOne({
    _id: idToponyme,
    _bal: idBal,
    nom: 'foo',
    commune: '12345',
    _deleted: new Date()
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

  return t.throwsAsync(() => Numero.update(_id, {voie: idVoie.toString(), toponyme: idToponyme.toString()}), {message: 'Toponyme not found'})
})

test('update a numero / no suffixe', async t => {
  const idBal = new mongo.ObjectId()
  const idVoie = new mongo.ObjectId()
  const _id = new mongo.ObjectId()
  const referenceDate = new Date()

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
  const numb = {
    _id,
    _bal: idBal,
    commune: '12345',
    voie: idVoie,
    numero: 42,
    suffixe: 'foo'
  }
  await mongo.db.collection('numeros').insertOne(numb)

  const numero = await Numero.update(_id, {
    numero: 24
  }, numb)

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
  const numb = {
    _id,
    _bal: idBal,
    commune: '12345',
    voie: idVoie,
    numero: 42
  }
  await mongo.db.collection('numeros').insertOne(numb)

  const numero = await Numero.update(_id, {
    numero: 24
  }, numb)

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
  const numb = {
    _id,
    _bal: idBal,
    commune: '12345',
    voie: idVoieA,
    numero: 42,
    suffixe: 'foo',
    positions: [],
    parcelles: [],
    _created: referenceDate,
    _updated: referenceDate
  }
  await mongo.db.collection('numeros').insertOne(numb)

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
  }, numb)

  t.is(numero.numero, 24)
  t.is(numero.suffixe, 'bar')
  t.is(numero.comment, 'Commentaire de numéro 123 !')
  t.is(numero.positions.length, 1)
  t.is(Object.keys(numero).length, 13)

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
  const numb = {
    _id,
    _bal: idBal,
    commune: '12345',
    voie: idVoie,
    numero: 42,
    positions: [],
    parcelles: [],
    _created: referenceDate,
    _updated: referenceDate
  }
  await mongo.db.collection('numeros').insertOne(numb)

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
  }, numb)

  t.is(numero.numero, 24)
  t.is(numero.positions.length, 1)
  t.is(Object.keys(numero).length, 12)
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
  const numb = {
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
  }
  await mongo.db.collection('numeros').insertOne(numb)

  const numero = await Numero.update(_id, {
    numero: 42,
    voie: idVoie.toString(),
    toponyme: idToponymeB.toString(),
    parcelles: [],
    positions: [{
      point: {type: 'Point', coordinates: [0, 0]},
      source: 'source',
      type: 'entrée'
    }]
  }, numb)

  t.is(numero.numero, 42)
  t.is(numero.positions.length, 1)
  t.is(Object.keys(numero).length, 12)
  t.deepEqual(numero.toponyme, idToponymeB)
})

test('update a numero / numero deleted', async t => {
  const idBal = new mongo.ObjectId()
  const idVoie = new mongo.ObjectId()
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
  await mongo.db.collection('numeros').insertOne({
    _id,
    _bal: idBal,
    commune: '12345',
    voie: idVoie,
    numero: 42,
    positions: [],
    certifie: false,
    _created: referenceDate,
    _updated: referenceDate,
    _deleted: referenceDate,
  })

  return t.throwsAsync(Numero.update(_id, {
    numero: 42,
    voie: idVoie.toString(),
    parcelles: [],
    positions: [{
      point: {type: 'Point', coordinates: [0, 0]},
      source: 'source',
      type: 'entrée'
    }]
  }), {message: 'Numero not found'})
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

test('softdelete a numero', async t => {
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

  await Numero.softRemove(_id)

  const numero = await mongo.db.collection('numeros').findOne({_id})
  t.not(numero._deleted, null)

  const bal = await mongo.db.collection('bases_locales').findOne({_id: idBal})
  t.notDeepEqual(referenceDate, bal._updated)

  const voie = await mongo.db.collection('voies').findOne({_id: idVoie})
  t.notDeepEqual(referenceDate, voie._updated)
})

test('softdelete a numero with position', async t => {
  const idVoie = new mongo.ObjectId()
  await mongo.db.collection('voies').insertOne({
    _id: idVoie,
    commune: '12345',
  })
  const numeros = [
    {
      _id: new mongo.ObjectId(),
      voie: idVoie,
      commune: '12345',
      numero: 42,
      suffixe: 'foo',
      positions: [{
        source: 'inconnue',
        type: 'entrée',
        point: {type: 'Point', coordinates: [1, 1]}
      }]
    },
    {
      _id: new mongo.ObjectId(),
      voie: idVoie,
      commune: '12345',
      numero: 42,
      suffixe: 'foo',
      positions: [{
        source: 'inconnue',
        type: 'entrée',
        point: {type: 'Point', coordinates: [1, 1]}
      }]
    }
  ]

  await mongo.db.collection('numeros').insertMany(numeros)
  await Numero.softRemove(numeros[0]._id)
  // CHECK VOIE
  const voie = await mongo.db.collection('voies').findOne({_id: idVoie})
  const centroid = {
    geometry: {
      coordinates: [1, 1],
      type: 'Point',
    },
    properties: {},
    type: 'Feature',
  }
  const centroidTiles = [
    '13/4118/4073',
    '14/8237/8146',
    '15/16475/16292',
    '16/32950/32585',
    '17/65900/65171',
    '18/131800/130343',
    '19/263600/260687'
  ]
  t.deepEqual(voie.centroid, centroid)
  t.deepEqual(voie.centroidTiles, centroidTiles)
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
    numerosIds: [idNumeroA.toString(), idNumeroB.toString()],
    changes: {
      voie: idVoieB.toString(),
      certifie: true
    }
  })

  const baseLocale = await mongo.db.collection('bases_locales').find({_id: idBal})
  t.notDeepEqual(baseLocale._updated, referenceDate)

  const voies = await mongo.db.collection('voies').find({_bal: idBal}).toArray()
  t.notDeepEqual(voies[0]._updated, referenceDate)
  t.notDeepEqual(voies[1]._updated, referenceDate)

  const numeros = await mongo.db.collection('numeros').find({_bal: idBal}).toArray()
  t.is(numeros[0].certifie, true)
  t.is(numeros[1].certifie, true)
  t.notDeepEqual(numeros[0]._updated, referenceDate)
  t.deepEqual(numeros[1]._updated, referenceDate)
})

test('batch numeros / numero deleted', async t => {
  const idBal = new mongo.ObjectId()
  const idVoieA = new mongo.ObjectId()
  const idVoieB = new mongo.ObjectId()
  const idNumeroA = new mongo.ObjectId()
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
    _updated: referenceDate,
    _deleted: referenceDate
  })

  const res = await Numero.batchUpdateNumeros(idBal, {
    numerosIds: [idNumeroA.toString()],
    changes: {
      voie: idVoieB.toString(),
      certifie: true
    }
  })
  t.is(res.modifiedCount, 0)
})

test('batch numeros / invalid certifie value', async t => {
  const idBal = new mongo.ObjectId()
  const idVoie = new mongo.ObjectId()

  const error = await t.throwsAsync(() => Numero.batchUpdateNumeros(idBal, {
    numeros: [],
    changes: {
      voie: idVoie.toString(),
      certifie: 'foo'
    }
  }))

  t.deepEqual(error.validation, {
    certifie: ['Le champ certifie doit être de type "boolean"']
  })
})

test('batchRemoveNumeros', async t => {
  const idBal = new mongo.ObjectId()
  const referenceDate = new Date('2021-01-01')
  const idNumeroA = new mongo.ObjectId()
  const idNumeroB = new mongo.ObjectId()
  const idNumeroC = new mongo.ObjectId()

  await mongo.db.collection('numeros').insertMany([
    {
      _id: idNumeroA,
      _bal: idBal,
      numero: 42,
      _created: referenceDate,
      _updated: referenceDate
    },
    {
      _id: idNumeroB,
      _bal: idBal,
      numero: 42,
      _created: referenceDate,
      _updated: referenceDate
    },
    {
      _id: idNumeroC,
      _bal: idBal,
      numero: 42,
      _created: referenceDate,
      _updated: referenceDate,
      _deleted: referenceDate
    }

  ])
  const res = await Numero.batchRemoveNumeros(idBal, {numerosIds: [idNumeroA, idNumeroB, idNumeroC]})

  t.deepEqual(res, {deletedCount: 3})
  const numeroA = await mongo.db.collection('numeros').findOne({_id: idNumeroA})
  t.falsy(numeroA)
  const numeroB = await mongo.db.collection('numeros').findOne({_id: idNumeroB})
  t.falsy(numeroB)
})

test('batchSoftRemoveNumeros', async t => {
  const idBal = new mongo.ObjectId()
  const referenceDate = new Date('2021-01-01')
  const idNumeroA = new mongo.ObjectId()
  const idNumeroB = new mongo.ObjectId()
  const idNumeroC = new mongo.ObjectId()

  await mongo.db.collection('numeros').insertMany([
    {
      _id: idNumeroA,
      _bal: idBal,
      numero: 42,
      _created: referenceDate,
      _updated: referenceDate
    },
    {
      _id: idNumeroB,
      _bal: idBal,
      numero: 42,
      _created: referenceDate,
      _updated: referenceDate
    },
    {
      _id: idNumeroC,
      _bal: idBal,
      numero: 42,
      _created: referenceDate,
      _updated: referenceDate,
      _deleted: referenceDate
    }

  ])
  const res = await Numero.batchSoftRemoveNumeros(idBal, {numerosIds: [idNumeroA, idNumeroB, idNumeroC]})

  t.deepEqual(res, {modifiedCount: 3})
  const numeroA = await mongo.db.collection('numeros').findOne({_id: idNumeroA})
  t.not(numeroA._deleted, null)
  const numeroB = await mongo.db.collection('numeros').findOne({_id: idNumeroB})
  t.not(numeroB._deleted, null)
})

test('fetchByToponyme', async t => {
  const idVoieA = new mongo.ObjectId()
  const idNumeroA = new mongo.ObjectId()
  const idNumeroB = new mongo.ObjectId()
  const idToponyme = new mongo.ObjectId()
  const referenceDate = new Date('2021-01-01')

  await mongo.db.collection('voies').insertOne({
    _id: idVoieA,
    commune: '12345',
    _updated: referenceDate
  })
  await mongo.db.collection('numeros').insertOne({
    _id: idNumeroA,
    commune: '12345',
    voie: idVoieA,
    numero: 21,
    toponyme: idToponyme.toString(),
    _created: referenceDate,
    _updated: referenceDate
  })
  await mongo.db.collection('numeros').insertOne({
    _id: idNumeroB,
    commune: '12345',
    voie: idVoieA,
    numero: 42,
    toponyme: idToponyme.toString(),
    _created: referenceDate,
    _updated: referenceDate
  })
  await mongo.db.collection('toponymes').insertOne({
    _id: idToponyme,
    nom: 'foo',
    commune: '12345'
  })

  const res = await Numero.fetchByToponyme(idToponyme.toString())

  t.is(res.length, 2)
  t.deepEqual(res[0].toponyme, idToponyme.toString())
  t.deepEqual(res[1].toponyme, idToponyme.toString())
  t.deepEqual(res[0].voie._id, idVoieA)
  t.deepEqual(res[1].voie._id, idVoieA)
})

test('fetchByToponyme / numero deleted', async t => {
  const idVoieA = new mongo.ObjectId()
  const idNumeroA = new mongo.ObjectId()
  const idNumeroB = new mongo.ObjectId()
  const idToponyme = new mongo.ObjectId()
  const referenceDate = new Date('2021-01-01')

  await mongo.db.collection('voies').insertOne({
    _id: idVoieA,
    commune: '12345',
    _updated: referenceDate
  })
  await mongo.db.collection('numeros').insertOne({
    _id: idNumeroA,
    commune: '12345',
    voie: idVoieA,
    numero: 21,
    toponyme: idToponyme.toString(),
    _created: referenceDate,
    _updated: referenceDate,
  })
  await mongo.db.collection('numeros').insertOne({
    _id: idNumeroB,
    commune: '12345',
    voie: idVoieA,
    numero: 42,
    toponyme: idToponyme.toString(),
    _created: referenceDate,
    _updated: referenceDate,
    _deleted: referenceDate
  })
  await mongo.db.collection('toponymes').insertOne({
    _id: idToponyme,
    nom: 'foo',
    commune: '12345'
  })

  const res = await Numero.fetchByToponyme(idToponyme.toString())

  t.is(res.length, 1)
  t.deepEqual(res[0].toponyme, idToponyme.toString())
  t.deepEqual(res[0].voie._id, idVoieA)
})

test('batch numeros / voie is deleted', async t => {
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
    _updated: referenceDate,
    _deleted: referenceDate
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

  return t.throwsAsync(Numero.batchUpdateNumeros(idBal, {
    numerosIds: [idNumeroA.toString(), idNumeroB.toString()],
    changes: {
      voie: idVoieB.toString(),
      certifie: true
    }
  }), {message: 'Voie not found'})
})

test('batch numeros / toponyme is deleted', async t => {
  const idBal = new mongo.ObjectId()
  const idVoie = new mongo.ObjectId()
  const idToponyme = new mongo.ObjectId()
  const idNumero = new mongo.ObjectId()
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
    _updated: referenceDate,
    _deleted: referenceDate
  })
  await mongo.db.collection('numeros').insertOne({
    _id: idNumero,
    _bal: idBal,
    commune: '12345',
    voie: idVoie,
    numero: 21,
    positions: [],
    certifie: false,
    _created: referenceDate,
    _updated: referenceDate
  })

  return t.throwsAsync(Numero.batchUpdateNumeros(idBal, {
    numerosIds: [idNumero.toString()],
    changes: {
      toponyme: idToponyme.toString(),
      certifie: true
    }
  }), {message: 'Toponyme not found'})
})

test('batch numeros with positions / change voie', async t => {
  const idBal = new mongo.ObjectId()
  const voies = [
    {_bal: idBal, _id: new mongo.ObjectId()},
    {_bal: idBal, _id: new mongo.ObjectId()},
  ]
  await mongo.db.collection('voies').insertMany(voies)

  const numeros = [
    {
      _id: new mongo.ObjectId(),
      _bal: idBal,
      voie: voies[0]._id,
      positions: [{
        source: 'inconnue',
        type: 'entrée',
        point: {type: 'Point', coordinates: [0.5, 0.5]}
      }]
    },
    {
      _id: new mongo.ObjectId(),
      _bal: idBal,
      voie: voies[0]._id,
      positions: [{
        source: 'inconnue',
        type: 'entrée',
        point: {type: 'Point', coordinates: [1.5, 1.5]}
      }]
    }
  ]
  await mongo.db.collection('numeros').insertMany(numeros)

  await Numero.batchUpdateNumeros(idBal, {
    numerosIds: numeros.map(n => n._id.toHexString()),
    changes: {voie: voies[1]._id.toString()}
  })

  const voie1 = await mongo.db.collection('voies').findOne({_id: voies[0]._id})
  t.is(voie1.centroid, null)
  t.is(voie1.centroidTiles, null)
  t.is(voie1.traceTiles, null)

  const voie2 = await mongo.db.collection('voies').findOne({_id: voies[1]._id})
  const centroid = {
    geometry: {
      coordinates: [1, 1],
      type: 'Point',
    },
    properties: {},
    type: 'Feature',
  }
  const centroidTiles = [
    '13/4118/4073',
    '14/8237/8146',
    '15/16475/16292',
    '16/32950/32585',
    '17/65900/65171',
    '18/131800/130343',
    '19/263600/260687'
  ]
  t.deepEqual(voie2.centroid, centroid)
  t.deepEqual(voie2.centroidTiles, centroidTiles)
})

test('batchSoftRemoveNumeros with positions', async t => {
  const idBal = new mongo.ObjectId()
  const voie = {_bal: idBal, _id: new mongo.ObjectId()}
  await mongo.db.collection('voies').insertOne(voie)

  const numeros = [
    {
      _id: new mongo.ObjectId(),
      _bal: idBal,
      voie: voie._id,
      commune: '12345',
      numero: 42,
      suffixe: 'foo',
      positions: [{
        source: 'inconnue',
        type: 'entrée',
        point: {type: 'Point', coordinates: [1, 1]}
      }]
    },
    {
      _id: new mongo.ObjectId(),
      _bal: idBal,
      voie: voie._id,
      commune: '12345',
      numero: 42,
      suffixe: 'foo',
      positions: [{
        source: 'inconnue',
        type: 'entrée',
        point: {type: 'Point', coordinates: [1, 1]}
      }]
    }
  ]
  await mongo.db.collection('numeros').insertMany(numeros)

  await Numero.batchSoftRemoveNumeros(idBal, {numerosIds: [numeros[0]._id]})

  const voieRes = await mongo.db.collection('voies').findOne({_id: voie._id})
  const centroid = {
    geometry: {
      coordinates: [1, 1],
      type: 'Point',
    },
    properties: {},
    type: 'Feature',
  }
  const centroidTiles = [
    '13/4118/4073',
    '14/8237/8146',
    '15/16475/16292',
    '16/32950/32585',
    '17/65900/65171',
    '18/131800/130343',
    '19/263600/260687'
  ]
  t.deepEqual(voieRes.centroid, centroid)
  t.deepEqual(voieRes.centroidTiles, centroidTiles)
})
