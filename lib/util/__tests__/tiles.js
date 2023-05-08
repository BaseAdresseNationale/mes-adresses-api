const test = require('ava')
const {MongoMemoryServer} = require('mongodb-memory-server')
const mongo = require('../../util/mongo')
const {calcMetaTilesVoie, calcMetaTilesNumero} = require('../tiles')

let mongod

test.before('start server', async () => {
  mongod = await MongoMemoryServer.create()
  await mongo.connect(mongod.getUri())
})

test.after.always('cleanup', async () => {
  await mongo.disconnect()
  await mongod.stop()
})

test.beforeEach('clean database', async () => {
  await mongo.db.collection('voies').deleteMany({})
  await mongo.db.collection('numeros').deleteMany({})
})

test.serial('calcMetaTilesNumero without position', t => {
  const numeros = {
    _id: new mongo.ObjectId(),
  }
  const res = calcMetaTilesNumero(numeros)
  t.is(res.tiles, null)
})

test.serial('calcMetaTilesNumero', t => {
  const numeros = {
    _id: new mongo.ObjectId(),
    positions: [{
      source: 'inconnue',
      type: 'entrée',
      point: {type: 'Point', coordinates: [1, 1]}
    }]
  }
  const res = calcMetaTilesNumero(numeros)
  const tiles = [
    '13/4118/4073',
    '14/8237/8146',
    '15/16475/16292',
    '16/32950/32585',
    '17/65900/65171',
    '18/131800/130343',
    '19/263600/260687'
  ]
  t.deepEqual(res.tiles, tiles)
})

test.serial('calcMetaTilesVoie without positions numeros', async t => {
  const voie = {
    _id: new mongo.ObjectId(),
  }
  const numeros = [
    {
      _id: new mongo.ObjectId(),
      voie: voie._id,
      positions: null
    },
    {
      _id: new mongo.ObjectId(),
      voie: voie._id,
      positions: []
    }
  ]
  await mongo.db.collection('numeros').insertMany(numeros)
  const res = await calcMetaTilesVoie(voie)
  t.is(res.centroid, null)
  t.is(res.centroidTiles, null)
  t.is(res.traceTiles, null)
})

test.serial('calcMetaTilesVoie without numeros', async t => {
  const voie = {
    _id: new mongo.ObjectId(),
  }
  const res = await calcMetaTilesVoie(voie)
  t.is(res.centroid, null)
  t.is(res.centroidTiles, null)
  t.is(res.traceTiles, null)
})

test.serial('calcMetaTilesVoie', async t => {
  const voie = {
    _id: new mongo.ObjectId(),
  }
  const numeros = [
    {
      _id: new mongo.ObjectId(),
      voie: voie._id,
      positions: [{
        source: 'inconnue',
        type: 'entrée',
        point: {type: 'Point', coordinates: [0.5, 0.5]}
      }]
    },
    {
      _id: new mongo.ObjectId(),
      voie: voie._id,
      positions: [{
        source: 'inconnue',
        type: 'entrée',
        point: {type: 'Point', coordinates: [1.5, 1.5]}
      }]
    }
  ]
  await mongo.db.collection('numeros').insertMany(numeros)
  const res = await calcMetaTilesVoie(voie)
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
  t.deepEqual(res.centroid, centroid)
  t.deepEqual(res.centroidTiles, centroidTiles)
  t.is(res.traceTiles, null)
})

test.serial('calcMetaTilesVoie with no trace', async t => {
  const voie = {
    _id: new mongo.ObjectId(),
    typeNumerotation: 'metrique'
  }
  const numeros = [
    {
      _id: new mongo.ObjectId(),
      voie: voie._id,
      positions: [{
        source: 'inconnue',
        type: 'entrée',
        point: {type: 'Point', coordinates: [0.5, 0.5]}
      }]
    },
    {
      _id: new mongo.ObjectId(),
      voie: voie._id,
      positions: [{
        source: 'inconnue',
        type: 'entrée',
        point: {type: 'Point', coordinates: [1.5, 1.5]}
      }]
    }
  ]
  await mongo.db.collection('numeros').insertMany(numeros)
  const res = await calcMetaTilesVoie(voie)
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
  t.deepEqual(res.centroid, centroid)
  t.deepEqual(res.centroidTiles, centroidTiles)
  t.is(res.traceTiles, null)
})

test.serial('calcMetaTilesVoie with trace', async t => {
  const voie = {
    _id: new mongo.ObjectId(),
    typeNumerotation: 'metrique',
    trace: {type: 'LineString', coordinates: [[0.9999, 0.9999], [1.0001, 1.0001]]}
  }
  const res = await calcMetaTilesVoie(voie)
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
  const traceTiles = [
    '13/4118/4073'
  ]
  t.deepEqual(res.centroid, centroid)
  t.deepEqual(res.centroidTiles, centroidTiles)
  t.deepEqual(res.traceTiles, traceTiles)
})
