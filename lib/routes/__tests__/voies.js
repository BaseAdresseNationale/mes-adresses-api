const test = require('ava')
const {MongoMemoryServer} = require('mongodb-memory-server')
const express = require('express')
const request = require('supertest')
const {omit} = require('lodash')
const mongo = require('../../util/mongo')
const routes = require('..')

const GENERATED_VARS = ['_id', '_updated', '_created']
const KEYS = ['_id', '_bal', 'commune', 'nom', 'positions', 'code', '_created', '_updated', 'complement', 'typeNumerotation', 'trace']

const mongod = new MongoMemoryServer()

test.before('start server', async () => {
  await mongo.connect(await mongod.getUri())
})

test.beforeEach('clean database', async () => {
  await mongo.db.collection('bases_locales').deleteMany({})
  await mongo.db.collection('voies').deleteMany({})
})

test.after.always('cleanup', async () => {
  await mongo.disconnect()
  await mongod.stop()
})

function getApp() {
  const app = express()
  app.use(routes)
  return app
}

test.serial('create a voie', async t => {
  const _id = new mongo.ObjectID()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    nom: 'foo',
    description: 'bar',
    emails: ['me@domain.tld'],
    enableComplement: false,
    communes: ['12345'],
    token: 'coucou',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })

  const {status, body} = await request(getApp())
    .post(`/bases-locales/${_id}/communes/12345/voies`)
    .set({Authorization: 'Token coucou'})
    .send({nom: 'voie'})

  t.is(status, 201)
  t.deepEqual(omit(body, GENERATED_VARS), {
    _bal: _id.toHexString(),
    nom: 'voie',
    code: null,
    complement: null,
    commune: '12345',
    positions: [],
    typeNumerotation: 'numeric',
    trace: null
  })
  t.true(KEYS.every(k => k in body))
  t.is(Object.keys(body).length, KEYS.length)
})

test.serial('create a voie / invalid base locale', async t => {
  const _id = new mongo.ObjectID()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    nom: 'foo',
    description: 'bar',
    emails: ['me@domain.tld'],
    enableComplement: false,
    communes: ['12345'],
    token: 'coucou',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })

  const {status} = await request(getApp())
    .post('/bases-locales/42/communes/12345/voies')
    .set({Authorization: 'Token coucou'})
    .send({nom: 'voie'})

  t.is(status, 404)
})

test.serial('create a voie / invalid commune', async t => {
  const _id = new mongo.ObjectID()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    nom: 'foo',
    description: 'bar',
    emails: ['me@domain.tld'],
    enableComplement: false,
    communes: ['12345'],
    token: 'coucou',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })

  const {status, body} = await request(getApp())
    .post(`/bases-locales/${_id}/communes/11111/voies`)
    .set({Authorization: 'Token coucou'})
    .send({nom: 'voie'})

  t.is(status, 400)
  t.is(body.code, 400)
  t.is(body.message, 'Cette commune n’a pas encore été ajoutée à la base.')
})

test.serial('create a voie / invalid voie', async t => {
  const _id = new mongo.ObjectID()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    nom: 'foo',
    description: 'bar',
    emails: ['me@domain.tld'],
    enableComplement: false,
    communes: ['12345'],
    token: 'coucou',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })

  const {status, body} = await request(getApp())
    .post(`/bases-locales/${_id}/communes/12345/voies`)
    .set({Authorization: 'Token coucou'})
    .send({})

  t.is(status, 400)
  t.deepEqual(body, {
    code: 400,
    message: 'Invalid payload',
    validation: {
      nom: ['"nom" is required']
    }
  })
})

test.serial('create a voie / without admin token', async t => {
  const _id = new mongo.ObjectID()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    nom: 'foo',
    description: 'bar',
    emails: ['me@domain.tld'],
    enableComplement: false,
    communes: ['12345'],
    token: 'coucou',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })

  const {status} = await request(getApp())
    .post(`/bases-locales/${_id}/communes/12345/voies`)
    .send({nom: 'voie'})

  t.is(status, 403)
  const voies = await mongo.db.collection('voies').find({}).toArray()
  t.deepEqual(voies, [])
})

test.serial('get all voies from a commune', async t => {
  const _id = new mongo.ObjectID()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    nom: 'foo',
    description: 'bar',
    emails: ['me@domain.tld'],
    enableComplement: false,
    communes: ['12345'],
    token: 'coucou',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })
  await mongo.db.collection('voies').insertOne({
    _bal: _id,
    commune: '12345',
    nom: 'voie',
    code: null,
    complement: 'complement',
    positions: [],
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })

  const {status, body} = await request(getApp())
    .get(`/bases-locales/${_id}/communes/12345/voies`)

  t.is(status, 200)
  t.is(body.length, 1)
  t.deepEqual(omit(body[0], GENERATED_VARS), {
    _bal: _id.toHexString(),
    commune: '12345',
    nom: 'voie',
    complement: 'complement',
    code: null,
    positions: []
  })
})

test.serial('get all voies from a commune / invalid base locale', async t => {
  const _id = new mongo.ObjectID()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    nom: 'foo',
    description: 'bar',
    emails: ['me@domain.tld'],
    enableComplement: false,
    communes: [],
    token: 'coucou',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })

  const {status} = await request(getApp())
    .get('/bases-locales/42/communes/12345/voies')

  t.is(status, 404)
})

test.serial('get all voies from a commune / invalid commune', async t => {
  const _id = new mongo.ObjectID()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    nom: 'foo',
    description: 'bar',
    emails: ['me@domain.tld'],
    enableComplement: false,
    communes: ['12345'],
    token: 'coucou',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })
  await mongo.db.collection('voies').insertOne({
    _bal: _id,
    commune: '12345',
    nom: 'voie',
    code: null,
    complement: 'complement',
    positions: [],
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })

  const {status, body} = await request(getApp())
    .get(`/bases-locales/${_id}/communes/11111/voies`)

  t.is(status, 200)
  t.deepEqual(body, [])
})

test.serial('get a voie', async t => {
  const _balId = new mongo.ObjectID()
  const _id = new mongo.ObjectID()
  await mongo.db.collection('bases_locales').insertOne({
    _id: _balId,
    nom: 'foo',
    description: 'bar',
    emails: ['me@domain.tld'],
    enableComplement: false,
    communes: ['12345'],
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
    complement: 'complement',
    positions: [],
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
    complement: 'complement',
    positions: []
  })
})

test.serial('get a voie / invalid voie', async t => {
  const _id = new mongo.ObjectID()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    nom: 'foo',
    description: 'bar',
    emails: ['me@domain.tld'],
    enableComplement: false,
    communes: ['12345'],
    token: 'coucou',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })

  const {status} = await request(getApp())
    .get('/voies/42')

  t.is(status, 404)
})

test.serial('modify a voie', async t => {
  const _balId = new mongo.ObjectID()
  const _id = new mongo.ObjectID()
  await mongo.db.collection('bases_locales').insertOne({
    _id: _balId,
    nom: 'foo',
    description: 'bar',
    emails: ['me@domain.tld'],
    enableComplement: false,
    communes: ['12345'],
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
    complement: 'complement',
    positions: [],
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })

  const {status, body} = await request(getApp())
    .put(`/voies/${_id}`)
    .set({Authorization: 'Token coucou'})
    .send({nom: 'bar', positions: [{type: 'segment', point: {type: 'Point', coordinates: [0, 0]}}]})

  t.is(status, 200)
  t.is(body.nom, 'bar')
  t.is(body.positions.length, 1)
  t.is(body.positions[0].type, 'segment')
})

test.serial('modify a voie / without admin token', async t => {
  const _balId = new mongo.ObjectID()
  const _id = new mongo.ObjectID()
  await mongo.db.collection('bases_locales').insertOne({
    _id: _balId,
    nom: 'foo',
    description: 'bar',
    emails: ['me@domain.tld'],
    enableComplement: false,
    communes: ['12345'],
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
    complement: 'complement',
    positions: [],
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })

  const {status} = await request(getApp())
    .put(`/voies/${_id}`)
    .send({nom: 'bar'})

  t.is(status, 403)
})

test.serial('modify a voie / invalid payload', async t => {
  const _balId = new mongo.ObjectID()
  const _id = new mongo.ObjectID()
  await mongo.db.collection('bases_locales').insertOne({
    _id: _balId,
    nom: 'foo',
    description: 'bar',
    emails: ['me@domain.tld'],
    enableComplement: false,
    communes: ['12345'],
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
    complement: 'complement',
    positions: [],
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
      code: ['"code" with value "invalid code" fails to match the required pattern: /^[0-9A-Z]\\d{3}$/']
    }
  })
  const voie = await mongo.db.collection('voies').findOne({_id})
  t.is(voie.code, null)
})

test.serial('delete a voie', async t => {
  const _balId = new mongo.ObjectID()
  const _id = new mongo.ObjectID()
  await mongo.db.collection('bases_locales').insertOne({
    _id: _balId,
    nom: 'foo',
    description: 'bar',
    emails: ['me@domain.tld'],
    enableComplement: false,
    communes: ['12345'],
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
    complement: 'complement',
    positions: [],
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })

  const {status} = await request(getApp())
    .delete(`/voies/${_id}`)
    .set({Authorization: 'Token coucou'})

  t.is(status, 204)
  const voie = await mongo.db.collection('voies').findOne({_id})
  t.is(voie, null)
})

test.serial('delete a voie / without admin token', async t => {
  const _balId = new mongo.ObjectID()
  const _id = new mongo.ObjectID()
  await mongo.db.collection('bases_locales').insertOne({
    _id: _balId,
    nom: 'foo',
    description: 'bar',
    emails: ['me@domain.tld'],
    enableComplement: false,
    communes: ['12345'],
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
    complement: 'complement',
    positions: [],
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
  const _id = new mongo.ObjectID()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    nom: 'foo',
    description: 'bar',
    emails: ['me@domain.tld'],
    enableComplement: false,
    communes: ['12345'],
    token: 'coucou',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })

  const {status} = await request(getApp())
    .delete('/voies/42')
    .set({Authorization: 'Token coucou'})

  t.is(status, 404)
})
