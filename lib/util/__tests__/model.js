const test = require('ava')
const {MongoMemoryServer} = require('mongodb-memory-server')
const {expandVoiesOrToponymes} = require('../models')
const mongo = require('../../util/mongo')

let mongod

test.before('start server', async () => {
  mongod = await MongoMemoryServer.create()
  await mongo.connect(mongod.getUri())
})

test.after.always('cleanup', async () => {
  await mongo.disconnect()
  await mongod.stop()
})

test('expandVoiesOrToponymes voie', async t => {
  const _bal = new mongo.ObjectId()
  const trace = {
    type: 'LineString',
    coordinates: [[-122.09, 37.42], [-122.08, 37.43]]
  }
  const voies = [
    {
      _bal,
      _id: new mongo.ObjectId(),
      nom: 'voie1',
      trace,
      typeNumerotation: 'metrique'
    },
    {
      _bal,
      _id: new mongo.ObjectId(),
      nom: 'voie2',
    }
  ]
  await mongo.db.collection('voies').insertMany(voies)
  const numeros = [
    {
      _bal,
      _id: new mongo.ObjectId(),
      voie: voies[1]._id,
      numero: 1,
      positions: [{
        type: 'entrée',
        point: {
          type: 'Point',
          coordinates: [1, 1]
        }
      }],
      parcelles: ['1', '2', '3'],
      certifie: true,
    },
    {
      _bal,
      _id: new mongo.ObjectId(),
      voie: voies[1]._id,
      numero: 2,
      positions: [{
        type: 'entrée',
        point: {
          type: 'Point',
          coordinates: [2, 2]
        }
      }],
      comment: 'titi'
    },
  ]
  await mongo.db.collection('numeros').insertMany(numeros)
  const funcRes = await expandVoiesOrToponymes(_bal, voies, 'voie')
  const expectedRes = [
    {
      _bal,
      _id: voies[0]._id,
      nom: 'voie1',
      bbox: [-122.09, 37.42, -122.08, 37.43],
      trace,
      typeNumerotation: 'metrique',
      nbNumeros: 0,
      nbNumerosCertifies: 0,
      isAllCertified: false,
      commentedNumeros: [],
    },
    {
      _bal,
      _id: voies[1]._id,
      nom: 'voie2',
      bbox: [1, 1, 2, 2],
      nbNumeros: 2,
      nbNumerosCertifies: 1,
      isAllCertified: false,
      commentedNumeros: [{
        _id: numeros[1]._id,
        voie: voies[1]._id,
        numero: 2,
        positions: [{
          type: 'entrée',
          point: {
            type: 'Point',
            coordinates: [2, 2]
          }
        }],
        comment: 'titi'
      }],
    }
  ]
  t.deepEqual(funcRes, expectedRes)
})

test('expandVoiesOrToponymes toponyme', async t => {
  const _bal = new mongo.ObjectId()
  const toponymes = [
    {
      _bal,
      _id: new mongo.ObjectId(),
      nom: 'toponyme1',
      positions: [{
        type: 'entrée',
        point: {
          type: 'Point',
          coordinates: [1, 1]
        }
      }],
    },
    {
      _bal,
      _id: new mongo.ObjectId(),
      nom: 'toponyme2',
    }
  ]
  await mongo.db.collection('toponymes').insertMany(toponymes)
  const numeros = [
    {
      _bal,
      _id: new mongo.ObjectId(),
      toponyme: toponymes[1]._id,
      numero: 1,
      positions: [{
        type: 'entrée',
        point: {
          type: 'Point',
          coordinates: [1, 1]
        }
      }],
      certifie: true,
    },
    {
      _bal,
      _id: new mongo.ObjectId(),
      toponyme: toponymes[1]._id,
      numero: 2,
      positions: [{
        type: 'entrée',
        point: {
          type: 'Point',
          coordinates: [2, 2]
        }
      }],
      comment: 'titi',
      certifie: true,
    },
  ]
  await mongo.db.collection('numeros').insertMany(numeros)
  const funcRes = await expandVoiesOrToponymes(_bal, toponymes, 'toponyme')
  const expectedRes = [
    {
      _bal,
      _id: toponymes[0]._id,
      nom: 'toponyme1',
      bbox: [1, 1, 1, 1],
      nbNumeros: 0,
      nbNumerosCertifies: 0,
      isAllCertified: false,
      commentedNumeros: [],
      positions: [{
        type: 'entrée',
        point: {
          type: 'Point',
          coordinates: [1, 1]
        }
      }],
    },
    {
      _bal,
      _id: toponymes[1]._id,
      nom: 'toponyme2',
      bbox: [1, 1, 2, 2],
      nbNumeros: 2,
      nbNumerosCertifies: 2,
      isAllCertified: true,
      commentedNumeros: [{
        _id: numeros[1]._id,
        toponyme: toponymes[1]._id,
        numero: 2,
        certifie: true,
        positions: [{
          type: 'entrée',
          point: {
            type: 'Point',
            coordinates: [2, 2]
          }
        }],
        comment: 'titi'
      }],
    }
  ]
  t.deepEqual(funcRes, expectedRes)
})
