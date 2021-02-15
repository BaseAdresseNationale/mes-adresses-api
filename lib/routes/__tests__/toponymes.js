const test = require('ava')
const {MongoMemoryServer} = require('mongodb-memory-server')
const express = require('express')
const request = require('supertest')
const {omit} = require('lodash')
const mongo = require('../../util/mongo')
const routes = require('..')

const GENERATED_VARS = ['_id', '_updated', '_created']
const KEYS = ['_id', '_bal', 'nom', 'type', 'positions', '_created', '_updated']

const mongod = new MongoMemoryServer()

test.before('start server', async () => {
  await mongo.connect(await mongod.getUri())
})

test.after.always('cleanup', async () => {
  await mongo.disconnect()
  await mongod.stop()
})

test.beforeEach('clean database', async () => {
  await mongo.db.collection('bases_locales').deleteMany({})
  await mongo.db.collection('toponymes').deleteMany({})
})

function getApp() {
  const app = express()
  app.use(routes)
  return app
}

test.serial('create a toponyme', async t => {
  const _id = new mongo.ObjectID()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    nom: 'foo',
    emails: ['me@domain.tld'],
    enableComplement: false,
    communes: ['12345'],
    token: 'coucou',
    _created: new Date('2021-01-01'),
    _updated: new Date('2021-01-01')
  })

  const {status, body} = await request(getApp())
    .post(`/bases-locales/${_id}/toponymes`)
    .set({Authorization: 'Token coucou'})
    .send({nom: 'toponyme', type: 'lieu-dit'})

  t.is(status, 201)
  t.deepEqual(omit(body, GENERATED_VARS), {
    _bal: _id.toHexString(),
    nom: 'toponyme',
    type: 'lieu-dit',
    positions: []
  })
  t.true(KEYS.every(k => k in body))
  t.is(Object.keys(body).length, KEYS.length)
})

test.serial('create a toponyme / without nom', async t => {
  const _id = new mongo.ObjectID()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    nom: 'foo',
    emails: ['me@domain.tld'],
    enableComplement: false,
    communes: ['12345'],
    token: 'coucou',
    _created: new Date('2021-01-01'),
    _updated: new Date('2021-01-01')
  })

  const {status, body} = await request(getApp())
    .post(`/bases-locales/${_id}/toponymes`)
    .set({Authorization: 'Token coucou'})
    .send({type: 'lieu-dit'})

  t.is(status, 400)
  t.deepEqual(body, {
    code: 400,
    message: 'Invalid payload',
    validation: {
      nom: ['"nom" is required']
    }
  })
})

test.serial('create a toponyme / without type', async t => {
  const _id = new mongo.ObjectID()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    nom: 'foo',
    emails: ['me@domain.tld'],
    enableComplement: false,
    communes: ['12345'],
    token: 'coucou',
    _created: new Date('2021-01-01'),
    _updated: new Date('2021-01-01')
  })

  const {status, body} = await request(getApp())
    .post(`/bases-locales/${_id}/toponymes`)
    .set({Authorization: 'Token coucou'})
    .send({nom: 'toponyme'})

  t.is(status, 400)
  t.deepEqual(body, {
    code: 400,
    message: 'Invalid payload',
    validation: {
      type: ['"type" is required']
    }
  })
})

test.serial('create a toponyme / invalid type', async t => {
  const _id = new mongo.ObjectID()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    nom: 'foo',
    emails: ['me@domain.tld'],
    enableComplement: false,
    communes: ['12345'],
    token: 'coucou',
    _created: new Date('2021-01-01'),
    _updated: new Date('2021-01-01')
  })

  const {status, body} = await request(getApp())
    .post(`/bases-locales/${_id}/toponymes`)
    .set({Authorization: 'Token coucou'})
    .send({nom: 'toponyme', type: 'invalid'})

  t.is(status, 400)
  t.deepEqual(body, {
    code: 400,
    message: 'Invalid payload',
    validation: {
      type: ['"type" must be one of [lieu-dit, hameau]']
    }
  })
})

test.serial('create a toponyme / invalid base locale', async t => {
  const _id = new mongo.ObjectID()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    nom: 'foo',
    emails: ['me@domain.tld'],
    communes: ['12345'],
    token: 'coucou',
    _created: new Date('2021-01-01'),
    _updated: new Date('2021-01-01')
  })

  const {status} = await request(getApp())
    .post('/bases-locales/12345/toponymes')
    .set({Authorization: 'Token coucou'})
    .send({nom: 'toponyme', type: 'lieu-dit'})

  t.is(status, 404)
})

test.serial('create a toponyme / without admin token', async t => {
  const _id = new mongo.ObjectID()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    nom: 'foo',
    emails: ['me@domain.tld'],
    communes: ['12345'],
    token: 'coucou',
    _created: new Date('2021-01-01'),
    _updated: new Date('2021-01-01')
  })

  const {status} = await request(getApp())
    .post(`/bases-locales/${_id}/toponymes`)
    .send({nom: 'toponyme', type: 'lieu-dit'})

  t.is(status, 403)
  const toponymes = await mongo.db.collection('toponymes').find({}).toArray()
  t.deepEqual(toponymes, [])
})

test.serial('get all toponymes from a base locale', async t => {
  const _idBal = new mongo.ObjectID()
  const _idToponyeA = new mongo.ObjectID()
  const _idToponyeB = new mongo.ObjectID()
  await mongo.db.collection('bases_locales').insertOne({
    _id: _idBal,
    nom: 'foo',
    emails: ['me@domain.tld'],
    communes: ['12345'],
    token: 'coucou',
    _created: new Date('2021-01-01'),
    _updated: new Date('2021-01-01')
  })
  await mongo.db.collection('toponymes').insertMany([{
    _idToponyeA,
    _bal: _idBal,
    nom: 'toponymeA',
    type: 'lieu-dit',
    positions: [],
    _created: new Date('2021-01-01'),
    _updated: new Date('2021-01-01')
  }, {
    _idToponyeB,
    _bal: _idBal,
    nom: 'toponymeB',
    type: 'hameau',
    positions: [],
    _created: new Date('2021-01-01'),
    _updated: new Date('2021-01-01')
  }])

  const {status, body} = await request(getApp())
    .get(`/bases-locales/${_idBal}/toponymes`)

  t.is(status, 200)
  t.is(body.length, 2)
})

test.serial('get all toponymes from a base locale / invalid base locale', async t => {
  const _id = new mongo.ObjectID()
  const {status} = await request(getApp())
    .get(`/bases-locales/${_id}/toponymes`)

  t.is(status, 404)
})

test.serial('get a toponyme', async t => {
  const _idBal = new mongo.ObjectID()
  const _id = new mongo.ObjectID()
  await mongo.db.collection('bases_locales').insertOne({
    _id: _idBal,
    nom: 'foo',
    emails: ['me@domain.tld'],
    communes: ['12345'],
    token: 'coucou',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })
  await mongo.db.collection('toponymes').insertOne({
    _id,
    _bal: _idBal,
    nom: 'toponyme',
    type: 'lieu-dit',
    positions: [],
    _created: new Date('2021-01-01'),
    _updated: new Date('2021-01-01')
  })

  const {status, body} = await request(getApp())
    .get(`/toponymes/${_id}`)

  t.is(status, 200)
  t.deepEqual(omit(body, GENERATED_VARS), {
    _bal: _idBal.toHexString(),
    nom: 'toponyme',
    type: 'lieu-dit',
    positions: []
  })
  t.true(KEYS.every(k => k in body))
  t.is(Object.keys(body).length, KEYS.length)
})

test.serial('get a toponyme / invalid toponyme', async t => {
  const _id = new mongo.ObjectID()
  const {status} = await request(getApp())
    .get(`/toponymes/${_id}`)

  t.is(status, 404)
})

test.serial('modify a toponyme', async t => {
  const _idBal = new mongo.ObjectID()
  const _id = new mongo.ObjectID()
  await mongo.db.collection('bases_locales').insertOne({
    _id: _idBal,
    nom: 'foo',
    emails: ['me@domain.tld'],
    communes: ['12345'],
    token: 'coucou',
    _created: new Date('2021-01-01'),
    _updated: new Date('2021-01-01')
  })
  await mongo.db.collection('toponymes').insertOne({
    _id,
    _bal: _idBal,
    nom: 'toponyme',
    type: 'lieu-dit',
    positions: [],
    _created: new Date('2021-01-01'),
    _updated: new Date('2021-01-01')
  })

  const {status, body} = await request(getApp())
    .put(`/toponymes/${_id}`)
    .set({Authorization: 'Token coucou'})
    .send({nom: 'Le Moulin', type: 'hameau'})

  t.is(status, 200)
  t.is(body.nom, 'Le Moulin')
  t.is(body.type, 'hameau')
})

test.serial('modify a toponyme / invalid type', async t => {
  const _idBal = new mongo.ObjectID()
  const _id = new mongo.ObjectID()
  await mongo.db.collection('bases_locales').insertOne({
    _id: _idBal,
    nom: 'foo',
    emails: ['me@domain.tld'],
    communes: ['12345'],
    token: 'coucou',
    _created: new Date('2021-01-01'),
    _updated: new Date('2021-01-01')
  })
  await mongo.db.collection('toponymes').insertOne({
    _id,
    _bal: _idBal,
    nom: 'toponyme',
    type: 'lieu-dit',
    positions: [],
    _created: new Date('2021-01-01'),
    _updated: new Date('2021-01-01')
  })

  const {status, body} = await request(getApp())
    .put(`/toponymes/${_id}`)
    .set({Authorization: 'Token coucou'})
    .send({name: 'toponyme', type: 'invalid'})

  t.is(status, 400)
  t.deepEqual(body, {
    code: 400,
    message: 'Invalid payload',
    validation: {
      type: ['"type" must be one of [lieu-dit, hameau]']
    }
  })
})

test.serial('modify a toponyme / empty nom', async t => {
  const _idBal = new mongo.ObjectID()
  const _id = new mongo.ObjectID()
  await mongo.db.collection('bases_locales').insertOne({
    _id: _idBal,
    nom: 'foo',
    emails: ['me@domain.tld'],
    communes: ['12345'],
    token: 'coucou',
    _created: new Date('2021-01-01'),
    _updated: new Date('2021-01-01')
  })
  await mongo.db.collection('toponymes').insertOne({
    _id,
    _bal: _idBal,
    nom: 'toponyme',
    type: 'lieu-dit',
    positions: [],
    _created: new Date('2021-01-01'),
    _updated: new Date('2021-01-01')
  })

  const {status, body} = await request(getApp())
    .put(`/toponymes/${_id}`)
    .set({Authorization: 'Token coucou'})
    .send({nom: ''})

  t.is(status, 400)
  t.deepEqual(body, {
    code: 400,
    message: 'Invalid payload',
    validation: {
      nom: ['"nom" is not allowed to be empty']
    }
  })
})

test.serial('delete a toponyme', async t => {
  const _idBal = new mongo.ObjectID()
  const _id = new mongo.ObjectID()
  await mongo.db.collection('bases_locales').insertOne({
    _id: _idBal,
    nom: 'foo',
    emails: ['me@domain.tld'],
    communes: ['12345'],
    token: 'coucou',
    _created: new Date('2021-01-01'),
    _updated: new Date('2021-01-01')
  })
  await mongo.db.collection('toponymes').insertOne({
    _id,
    _bal: _idBal,
    nom: 'toponyme',
    type: 'lieu-dit',
    positions: [],
    _created: new Date('2021-01-01'),
    _updated: new Date('2021-01-01')
  })

  const {status} = await request(getApp())
    .delete(`/toponymes/${_id}`)
    .set({Authorization: 'Token coucou'})

  t.is(status, 204)
  const toponyme = await mongo.db.collection('toponymes').findOne({_id})
  t.falsy(toponyme)
})

test.serial('delete a toponyme / invalid toponyme', async t => {
  const _id = new mongo.ObjectID()
  const {status} = await request(getApp())
    .delete(`/toponymes/${_id}`)

  t.is(status, 404)
})

test.serial('delete a toponyme / without admin token', async t => {
  const _idBal = new mongo.ObjectID()
  const _id = new mongo.ObjectID()
  await mongo.db.collection('bases_locales').insertOne({
    _id: _idBal,
    nom: 'foo',
    emails: ['me@domain.tld'],
    communes: ['12345'],
    token: 'coucou',
    _created: new Date('2021-01-01'),
    _updated: new Date('2021-01-01')
  })
  await mongo.db.collection('toponymes').insertOne({
    _id,
    _bal: _idBal,
    nom: 'toponyme',
    type: 'lieu-dit',
    positions: [],
    _created: new Date('2021-01-01'),
    _updated: new Date('2021-01-01')
  })

  const {status} = await request(getApp())
    .delete(`/toponymes/${_id}`)

  t.is(status, 403)
})
