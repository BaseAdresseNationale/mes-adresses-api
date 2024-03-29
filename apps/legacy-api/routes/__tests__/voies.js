const test = require('ava')
const {MongoMemoryServer} = require('mongodb-memory-server')
const express = require('express')
const request = require('supertest')
const {omit} = require('lodash')
const mongo = require('../../util/mongo')
const routes = require('..')

const GENERATED_VARS = ['_id', '_updated', '_created']
const KEYS = ['_id', '_bal', 'commune', 'nom', 'code', '_created', '_updated', 'nomAlt', 'typeNumerotation', 'trace', 'nbNumeros', 'nbNumerosCertifies', 'isAllCertified', 'commentedNumeros', 'centroid', 'centroidTiles', 'traceTiles']

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
  await mongo.db.collection('bases_locales').deleteMany({})
  await mongo.db.collection('voies').deleteMany({})
})

function getApp() {
  const app = express()
  app.use(routes)
  return app
}

test.serial('create a voie', async t => {
  const _id = new mongo.ObjectId()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    nom: 'foo',
    emails: ['me@domain.tld'],
    commune: '97125',
    token: 'coucou',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })

  const {status, body} = await request(getApp())
    .post(`/bases-locales/${_id}/voies`)
    .set({Authorization: 'Token coucou'})
    .send({nom: 'la Pointe des Châteaux', nomAlt: {gcf: 'Lapwent'}})

  t.is(status, 201)
  t.deepEqual(omit(body, GENERATED_VARS), {
    _bal: _id.toHexString(),
    nom: 'la Pointe des Châteaux',
    nomAlt: {gcf: 'Lapwent'},
    code: null,
    commune: '97125',
    nbNumeros: 0,
    nbNumerosCertifies: 0,
    commentedNumeros: [],
    isAllCertified: false,
    typeNumerotation: 'numerique',
    trace: null,
    centroid: null,
    centroidTiles: null,
    traceTiles: null,
  })
  t.true(KEYS.every(k => k in body))
  t.is(Object.keys(body).length, KEYS.length)
})

test.serial('create a voie / with 2 nomAlt', async t => {
  const _id = new mongo.ObjectId()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    nom: 'foo',
    emails: ['me@domain.tld'],
    commune: '97125',
    token: 'coucou',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })

  const {status, body} = await request(getApp())
    .post(`/bases-locales/${_id}/voies`)
    .set({Authorization: 'Token coucou'})
    .send({nom: 'la Pointe des Châteaux', nomAlt: {gcf: 'Lapwent', bre: 'Ar Beg'}})

  t.is(status, 201)
  t.deepEqual(omit(body, GENERATED_VARS), {
    _bal: _id.toHexString(),
    nom: 'la Pointe des Châteaux',
    nomAlt: {gcf: 'Lapwent', bre: 'Ar Beg'},
    code: null,
    commune: '97125',
    nbNumeros: 0,
    nbNumerosCertifies: 0,
    isAllCertified: false,
    commentedNumeros: [],
    typeNumerotation: 'numerique',
    trace: null,
    centroid: null,
    centroidTiles: null,
    traceTiles: null,
  })
  t.true(KEYS.every(k => k in body))
  t.is(Object.keys(body).length, KEYS.length)
})

test.serial('create a voie / with unsupported nomAlt', async t => {
  const _id = new mongo.ObjectId()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    nom: 'foo',
    emails: ['me@domain.tld'],
    commune: '97125',
    token: 'coucou',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })

  const {status, body} = await request(getApp())
    .post(`/bases-locales/${_id}/voies`)
    .set({Authorization: 'Token coucou'})
    .send({nom: 'la Pointe des Châteaux', nomAlt: {gua: 'Lapwent', bri: 'Ar Beg', cos: 'Pointe'}})

  t.is(status, 400)
  t.deepEqual(body, {
    code: 400,
    message: 'Invalid payload',
    validation: {
      nomAlt: [
        'Le code langue régionale gua n’est pas supporté',
        'Le code langue régionale bri n’est pas supporté'
      ]
    }
  })
})

test.serial('create a voie / invalid base locale', async t => {
  const _id = new mongo.ObjectId()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    nom: 'foo',
    emails: ['me@domain.tld'],
    commune: '12345',
    token: 'coucou',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })

  const {status} = await request(getApp())
    .post('/bases-locales/42/voies')
    .set({Authorization: 'Token coucou'})
    .send({nom: 'voie'})

  t.is(status, 404)
})

test.serial('create a voie / invalid voie', async t => {
  const _id = new mongo.ObjectId()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    nom: 'foo',
    emails: ['me@domain.tld'],
    commune: '12345',
    token: 'coucou',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })

  const {status, body} = await request(getApp())
    .post(`/bases-locales/${_id}/voies`)
    .set({Authorization: 'Token coucou'})
    .send({})

  t.is(status, 400)
  t.deepEqual(body, {
    code: 400,
    message: 'Invalid payload',
    validation: {
      nom: ['Le champ nom est obligatoire']
    }
  })
})

test.serial('create a voie / without admin token', async t => {
  const _id = new mongo.ObjectId()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    nom: 'foo',
    emails: ['me@domain.tld'],
    commune: '12345',
    token: 'coucou',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })

  const {status} = await request(getApp())
    .post(`/bases-locales/${_id}/voies`)
    .send({nom: 'voie'})

  t.is(status, 403)
  const voies = await mongo.db.collection('voies').find({}).toArray()
  t.deepEqual(voies, [])
})

test.serial('get all voies from a commune', async t => {
  const _id = new mongo.ObjectId()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    nom: 'foo',
    emails: ['me@domain.tld'],
    commune: '12345',
    token: 'coucou',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })
  await mongo.db.collection('voies').insertOne({
    _bal: _id,
    commune: '12345',
    nom: 'voie',
    code: null,
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })

  const {status, body} = await request(getApp())
    .get(`/bases-locales/${_id}/voies`)

  t.is(status, 200)
  t.is(body.length, 1)
  t.deepEqual(omit(body[0], GENERATED_VARS), {
    _bal: _id.toHexString(),
    commune: '12345',
    nom: 'voie',
    nbNumeros: 0,
    nbNumerosCertifies: 0,
    isAllCertified: false,
    commentedNumeros: [],
    code: null
  })
})

test.serial('get all voies from a commune / invalid base locale', async t => {
  const _id = new mongo.ObjectId()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    nom: 'foo',
    emails: ['me@domain.tld'],
    commune: '12345',
    token: 'coucou',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })

  const {status} = await request(getApp())
    .get('/bases-locales/42/voies')

  t.is(status, 404)
})

test.serial('get a voie', async t => {
  const _balId = new mongo.ObjectId()
  const _id = new mongo.ObjectId()
  await mongo.db.collection('bases_locales').insertOne({
    _id: _balId,
    nom: 'foo',
    emails: ['me@domain.tld'],
    commune: '12345',
    token: 'coucou',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })
  await mongo.db.collection('voies').insertOne({
    _id,
    _bal: _balId,
    commune: '12345',
    nom: 'voie',
    code: null,
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })

  const {status, body} = await request(getApp())
    .get(`/voies/${_id}`)

  t.is(status, 200)
  t.deepEqual(omit(body, ['_created', '_updated']), {
    _id: _id.toHexString(),
    _bal: _balId.toHexString(),
    commune: '12345',
    nom: 'voie',
    code: null,
    nbNumeros: 0,
    nbNumerosCertifies: 0,
    isAllCertified: false,
    commentedNumeros: []
  })
})

test.serial('get a voie with one certified numero', async t => {
  const _balId = new mongo.ObjectId()
  const _id = new mongo.ObjectId()
  const _idNumeroA = new mongo.ObjectId()
  const _idNumeroB = new mongo.ObjectId()

  await mongo.db.collection('bases_locales').insertOne({
    _id: _balId,
    nom: 'foo',
    emails: ['me@domain.tld'],
    commune: '12345',
    token: 'coucou',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })
  await mongo.db.collection('voies').insertOne({
    _id,
    _bal: _balId,
    commune: '12345',
    nom: 'voie',
    code: null,
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })
  await mongo.db.collection('numeros').insertOne({
    _id: _idNumeroA,
    _bal: _balId,
    commune: '12345',
    voie: _id,
    numero: 42,
    positions: [],
    certifie: true,
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })
  await mongo.db.collection('numeros').insertOne({
    _id: _idNumeroB,
    _bal: _balId,
    commune: '12345',
    voie: _id,
    numero: 43,
    positions: [],
    certifie: false,
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })

  const {status, body} = await request(getApp())
    .get(`/voies/${_id}`)

  t.is(status, 200)
  t.deepEqual(omit(body, ['_created', '_updated']), {
    _id: _id.toHexString(),
    _bal: _balId.toHexString(),
    commune: '12345',
    nom: 'voie',
    code: null,
    nbNumeros: 2,
    nbNumerosCertifies: 1,
    isAllCertified: false,
    commentedNumeros: []
  })
})

test.serial('get a voie / invalid voie', async t => {
  const _id = new mongo.ObjectId()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    nom: 'foo',
    emails: ['me@domain.tld'],
    commune: '12345',
    token: 'coucou',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })

  const {status} = await request(getApp())
    .get('/voies/42')

  t.is(status, 404)
})

test.serial('modify a voie', async t => {
  const _balId = new mongo.ObjectId()
  const _id = new mongo.ObjectId()
  await mongo.db.collection('bases_locales').insertOne({
    _id: _balId,
    nom: 'foo',
    emails: ['me@domain.tld'],
    commune: '97125',
    token: 'coucou',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })
  await mongo.db.collection('voies').insertOne({
    _id,
    _bal: _balId,
    commune: '97125',
    nom: 'voie',
    code: null,
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })

  const {status, body} = await request(getApp())
    .put(`/voies/${_id}`)
    .set({Authorization: 'Token coucou'})
    .send({nom: 'la Pointe des Châteaux', nomAlt: {gcf: 'Lapwent'}})

  t.is(status, 200)
  t.is(body.nom, 'la Pointe des Châteaux')
  t.deepEqual(body.nomAlt, {gcf: 'Lapwent'})
})

test.serial('modify numeros by batch / certifie to false', async t => {
  const _balId = new mongo.ObjectId()
  const _id = new mongo.ObjectId()
  const _idNumeroA = new mongo.ObjectId()
  const _idNumeroB = new mongo.ObjectId()
  await mongo.db.collection('bases_locales').insertOne({
    _id: _balId,
    nom: 'foo',
    emails: ['me@domain.tld'],
    commune: '12345',
    token: 'coucou',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })
  await mongo.db.collection('voies').insertOne({
    _id,
    _bal: _balId,
    commune: '12345',
    nom: 'voie',
    code: null,
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })
  await mongo.db.collection('numeros').insertOne({
    _id: _idNumeroA,
    _bal: _id,
    commune: '12345',
    voie: _id,
    numero: 42,
    positions: [],
    certifie: true,
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })
  await mongo.db.collection('numeros').insertOne({
    _id: _idNumeroB,
    _bal: _id,
    commune: '12345',
    voie: _id,
    numero: 43,
    positions: [],
    certifie: true,
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })

  const {status, body} = await request(getApp())
    .post(`/voies/${_id}/batch`)
    .set({Authorization: 'Token coucou'})
    .send({certifie: false})

  const numeroA = await mongo.db.collection('numeros').findOne({_id: _idNumeroA})
  const numeroB = await mongo.db.collection('numeros').findOne({_id: _idNumeroB})

  t.is(status, 200)
  t.is(body.modifiedCount, 2)
  t.falsy(numeroA.certifie)
  t.falsy(numeroB.certifie)
})

test.serial('modify a voie / without admin token', async t => {
  const _balId = new mongo.ObjectId()
  const _id = new mongo.ObjectId()
  await mongo.db.collection('bases_locales').insertOne({
    _id: _balId,
    nom: 'foo',
    emails: ['me@domain.tld'],
    commune: '12345',
    token: 'coucou',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })
  await mongo.db.collection('voies').insertOne({
    _id,
    _bal: _balId,
    commune: '12345',
    nom: 'voie',
    code: null,
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })

  const {status} = await request(getApp())
    .put(`/voies/${_id}`)
    .send({nom: 'bar'})

  t.is(status, 403)
})

test.serial('modify a voie / invalid payload', async t => {
  const _balId = new mongo.ObjectId()
  const _id = new mongo.ObjectId()
  await mongo.db.collection('bases_locales').insertOne({
    _id: _balId,
    nom: 'foo',
    emails: ['me@domain.tld'],
    commune: '12345',
    token: 'coucou',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })
  await mongo.db.collection('voies').insertOne({
    _id,
    _bal: _balId,
    commune: '12345',
    nom: 'voie',
    code: null,
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })

  const {status, body} = await request(getApp())
    .put(`/voies/${_id}`)
    .set({Authorization: 'Token coucou'})
    .send({code: 'invalid code'})

  t.is(status, 400)
  t.deepEqual(body, {
    code: 400,
    message: 'Invalid payload',
    validation: {
      code: ['Le code voie est invalide']
    }
  })
  const voie = await mongo.db.collection('voies').findOne({_id})
  t.is(voie.code, null)
})

test.serial('delete a voie', async t => {
  const _balId = new mongo.ObjectId()
  const _id = new mongo.ObjectId()
  await mongo.db.collection('bases_locales').insertOne({
    _id: _balId,
    nom: 'foo',
    emails: ['me@domain.tld'],
    commune: '12345',
    token: 'coucou',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })
  await mongo.db.collection('voies').insertOne({
    _id,
    _bal: _balId,
    commune: '12345',
    nom: 'voie',
    code: null,
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })

  const {status} = await request(getApp())
    .delete(`/voies/${_id}`)
    .set({Authorization: 'Token coucou'})

  t.is(status, 204)
  const voie = await mongo.db.collection('voies').findOne({_id})
  t.falsy(voie)
})

test.serial('soft-delete a voie', async t => {
  const _balId = new mongo.ObjectId()
  const _id = new mongo.ObjectId()
  await mongo.db.collection('bases_locales').insertOne({
    _id: _balId,
    nom: 'foo',
    emails: ['me@domain.tld'],
    commune: '12345',
    token: 'coucou',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })
  await mongo.db.collection('voies').insertOne({
    _id,
    _bal: _balId,
    commune: '12345',
    nom: 'voie',
    code: null,
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })

  const {status} = await request(getApp())
    .put(`/voies/${_id}/soft-delete`)
    .set({Authorization: 'Token coucou'})

  t.is(status, 200)
  const voie = await mongo.db.collection('voies').findOne({_id})
  t.not(voie._deleted, null)
})

test.serial('delete a voie / without admin token', async t => {
  const _balId = new mongo.ObjectId()
  const _id = new mongo.ObjectId()
  await mongo.db.collection('bases_locales').insertOne({
    _id: _balId,
    nom: 'foo',
    emails: ['me@domain.tld'],
    commune: '12345',
    token: 'coucou',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })
  await mongo.db.collection('voies').insertOne({
    _id,
    _bal: _balId,
    commune: '12345',
    nom: 'voie',
    code: null,
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })

  const {status} = await request(getApp())
    .delete(`/voies/${_id}`)

  t.is(status, 403)
  const voie = await mongo.db.collection('voies').findOne({_id})
  t.truthy(voie)
})

test.serial('delete a voie / invalid voie', async t => {
  const _id = new mongo.ObjectId()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    nom: 'foo',
    emails: ['me@domain.tld'],
    commune: '12345',
    token: 'coucou',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })

  const {status} = await request(getApp())
    .delete('/voies/42')
    .set({Authorization: 'Token coucou'})

  t.is(status, 404)
})

test('Count numeros & certified numeros', async t => {
  const _balId = new mongo.ObjectId()
  const _id = new mongo.ObjectId()

  await mongo.db.collection('bases_locales').insertOne({
    _id: _balId,
    token: 'coucou',
    emails: ['living@data.com'],
    commune: '55325'
  })

  await mongo.db.collection('voies').insertOne({
    _id,
    _bal: _balId,
    commune: '55325',
    nom: 'voie',
    code: null,
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })

  await mongo.db.collection('numeros').insertOne({_bal: _balId, voie: _id, numero: 1, certifie: true})
  await mongo.db.collection('numeros').insertOne({_bal: _balId, voie: _id, numero: 2, certifie: true})

  const {status, body} = await request(getApp())
    .get(`/voies/${_id}`)

  t.is(status, 200)
  t.is(body._id, _id.toHexString())
  t.is(body.commune, '55325')
  t.is(body.nbNumeros, 2)
  t.is(body.nbNumerosCertifies, 2)
  t.is(body.isAllCertified, true)
})

test('Commented numeros', async t => {
  const _balId = new mongo.ObjectId()
  const _id = new mongo.ObjectId()

  await mongo.db.collection('bases_locales').insertOne({
    _id: _balId,
    token: 'coucou',
    emails: ['living@data.com'],
    commune: '55325'
  })

  await mongo.db.collection('voies').insertOne({
    _id,
    _bal: _balId,
    commune: '55325',
    nom: 'voie',
    code: null,
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })

  await mongo.db.collection('numeros').insertOne({_bal: _balId, voie: _id, numero: 1, comment: 'mon commentaire 1'})
  await mongo.db.collection('numeros').insertOne({_bal: _balId, voie: _id, numero: 2, comment: 'mon commentaire 2'})

  const {status, body} = await request(getApp())
    .get(`/voies/${_id}`)

  t.is(status, 200)
  t.is(body._id, _id.toHexString())
  t.is(body.commune, '55325')
  t.is(body.commentedNumeros.length, 2)
  t.is(body.commentedNumeros[0].comment, 'mon commentaire 1')
  t.is(body.commentedNumeros[1].comment, 'mon commentaire 2')
})
