require('dotenv').config()

process.env.API_DEPOT_URL = 'https://api-depot-url.fr'
process.env.API_DEPOT_TOKEN = 'xxxxxxxxxxxxxxx'

const test = require('ava')
const nock = require('nock')
const {MongoMemoryServer} = require('mongodb-memory-server')
const express = require('express')
const request = require('supertest')
const mongo = require('../../util/mongo')
const routes = require('..')

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
})

function getApp() {
  const app = express()
  app.use(routes)
  return app
}

const HABILITATION_KEYS = ['_id', 'strategyType', 'status', 'createdAt', 'updatedAt', 'expiresAt']

test.serial('create an habilitation for a baseLocale', async t => {
  const _id = new mongo.ObjectID()
  const now = new Date()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    nom: 'foo',
    emails: ['me@domain.co'],
    communes: ['27115'],
    token: 'coucou',
    _created: now,
    _updated: now
  })

  nock(process.env.API_DEPOT_URL, {
    reqheaders: {
      authorization: `Token ${process.env.API_DEPOT_TOKEN}`,
    },
  })
    .post('/communes/27115/habilitations')
    .reply(201, {
      _id: 'xxxxxxxxxx',
      codeCommune: '27115',
      emailCommune: 'email@commune.fr',
      strategy: null,
      client: {},
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      expiresAt: null
    })

  const {status, body} = await request(getApp())
    .post(`/bases-locales/${_id}/communes/27115/authentication`)
    .set({Authorization: 'Token coucou'})

  t.is(status, 200)
  t.true(HABILITATION_KEYS.every(k => k in body))
})

test.serial('create an habilitation for a baseLocale / with already active habilitation', async t => {
  const _id = new mongo.ObjectID()
  const now = new Date()
  const nextYear = new Date()
  nextYear.setFullYear(nextYear.getFullYear() + 1)
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    nom: 'foo',
    emails: ['me@domain.co'],
    communes: ['27115'],
    token: 'coucou',
    habilitation: {
      status: 'accepted',
      expiresAt: nextYear
    },
    _created: now,
    _updated: now
  })

  const {status, body} = await request(getApp())
    .post(`/bases-locales/${_id}/communes/27115/authentication`)
    .set({Authorization: 'Token coucou'})

  t.is(status, 412)
  t.deepEqual(body, {
    code: 412,
    message: 'Cette Base Adresse Locale possède déjà une habilitation'
  })
})

test.serial('create an habilitation for a baseLocale / with expired habilitation', async t => {
  const _id = new mongo.ObjectID()
  const now = new Date()
  const lastYear = new Date()
  lastYear.setFullYear(lastYear.getFullYear() - 1)

  await mongo.db.collection('bases_locales').insertOne({
    _id,
    nom: 'foo',
    emails: ['me@domain.co'],
    communes: ['27115'],
    token: 'coucou',
    habilitation: {
      status: 'accepted',
      expiresAt: lastYear
    },
    _created: now,
    _updated: now
  })

  nock(process.env.API_DEPOT_URL, {
    reqheaders: {
      authorization: `Token ${process.env.API_DEPOT_TOKEN}`,
    },
  })
    .post('/communes/27115/habilitations')
    .reply(201, {
      _id: 'xxxxxxxxxx',
      codeCommune: '27115',
      emailCommune: 'email@commune.fr',
      strategy: null,
      client: {},
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      expiresAt: null
    })

  const {status, body} = await request(getApp())
    .post(`/bases-locales/${_id}/communes/27115/authentication`)
    .set({Authorization: 'Token coucou'})

  t.is(status, 200)
  t.true(body.status === 'pending')
})

test.serial('send email habilitation code', async t => {
  const _id = new mongo.ObjectID()
  const now = new Date()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    nom: 'foo',
    emails: ['me@domain.co'],
    communes: ['27115'],
    token: 'coucou',
    habilitation: {
      _id: 'xxxxxxxxxx',
      status: 'pending',
      expiresAt: null
    },
    _created: now,
    _updated: now
  })

  nock(process.env.API_DEPOT_URL, {
    reqheaders: {
      authorization: `Token ${process.env.API_DEPOT_TOKEN}`,
    },
  })
    .post('/habilitations/xxxxxxxxxx/authentication/email/send-pin-code')
    .reply(200, {code: 200, message: 'OK'})

  const {status} = await request(getApp())
    .post(`/bases-locales/${_id}/communes/27115/authentication/email/send-pin-code`)
    .set({Authorization: 'Token coucou'})

  t.is(status, 200)
})

test.serial('send email habilitation code / No habilitation', async t => {
  const _id = new mongo.ObjectID()
  const now = new Date()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    nom: 'foo',
    emails: ['me@domain.co'],
    communes: ['27115'],
    token: 'coucou',
    _created: now,
    _updated: now
  })

  const {status, body} = await request(getApp())
    .post(`/bases-locales/${_id}/communes/27115/authentication/email/send-pin-code`)
    .set({Authorization: 'Token coucou'})

  t.is(status, 412)
  t.deepEqual(body, {
    code: 412,
    message: 'Aucune demande d’habilitation trouvée'
  })
})

test.serial('send email habilitation code / No pending habilitation', async t => {
  const _id = new mongo.ObjectID()
  const now = new Date()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    nom: 'foo',
    emails: ['me@domain.co'],
    communes: ['27115'],
    habilitation: {
      status: 'accepted'
    },
    token: 'coucou',
    _created: now,
    _updated: now
  })

  const {status, body} = await request(getApp())
    .post(`/bases-locales/${_id}/communes/27115/authentication/email/send-pin-code`)
    .set({Authorization: 'Token coucou'})

  t.is(status, 412)
  t.deepEqual(body, {
    code: 412,
    message: 'Aucune demande d’habilitation en attente'
  })
})

test.serial('validate habilitation code', async t => {
  const _id = new mongo.ObjectID()
  const now = new Date()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    nom: 'foo',
    emails: ['me@domain.co'],
    communes: ['27115'],
    habilitation: {
      _id: 'xxxxxxxxxx',
      status: 'pending'
    },
    token: 'coucou',
    _created: now,
    _updated: now
  })

  nock(process.env.API_DEPOT_URL, {
    reqheaders: {
      authorization: `Token ${process.env.API_DEPOT_TOKEN}`,
    },
  })
    .post('/habilitations/xxxxxxxxxx/authentication/email/validate-pin-code', {
      code: '1234'
    })
    .reply(200, {
      _id: 'xxxxxxxxxx',
      status: 'accepted',
      strategy: {type: 'email'}
    })

  const {status, body} = await request(getApp())
    .post(`/bases-locales/${_id}/communes/27115/authentication/email/validate-pin-code`)
    .set({Authorization: 'Token coucou'})
    .send({code: '1234'})

  t.is(status, 200)
  t.deepEqual(body, {
    _id: 'xxxxxxxxxx',
    status: 'accepted',
    strategyType: 'email'
  })
})

test.serial('validate habilitation code / no code', async t => {
  const _id = new mongo.ObjectID()
  const now = new Date()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    nom: 'foo',
    emails: ['me@domain.co'],
    communes: ['27115'],
    habilitation: {
      _id: 'xxxxxxxxxx',
      status: 'pending'
    },
    token: 'coucou',
    _created: now,
    _updated: now
  })

  const {status, body} = await request(getApp())
    .post(`/bases-locales/${_id}/communes/27115/authentication/email/validate-pin-code`)
    .set({Authorization: 'Token coucou'})

  t.is(status, 400)
  t.deepEqual(body, {
    code: 400,
    message: 'code est un champs obligatoire'
  })
})

test.serial('validate habilitation code / no habilitation', async t => {
  const _id = new mongo.ObjectID()
  const now = new Date()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    nom: 'foo',
    emails: ['me@domain.co'],
    communes: ['27115'],
    token: 'coucou',
    _created: now,
    _updated: now
  })

  const {status, body} = await request(getApp())
    .post(`/bases-locales/${_id}/communes/27115/authentication/email/validate-pin-code`)
    .set({Authorization: 'Token coucou'})
    .send({code: '1234'})

  t.is(status, 412)
  t.deepEqual(body, {
    code: 412,
    message: 'Aucune demande d’habilitation trouvée'
  })
})

test.serial('validate habilitation code / no pending habilitation', async t => {
  const _id = new mongo.ObjectID()
  const now = new Date()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    nom: 'foo',
    emails: ['me@domain.co'],
    communes: ['27115'],
    habilitation: {
      _id: 'xxxxxxxxxx',
      status: 'accepted'
    },
    token: 'coucou',
    _created: now,
    _updated: now
  })

  const {status, body} = await request(getApp())
    .post(`/bases-locales/${_id}/communes/27115/authentication/email/validate-pin-code`)
    .set({Authorization: 'Token coucou'})
    .send({code: '1234'})

  t.is(status, 412)
  t.deepEqual(body, {
    code: 412,
    message: 'Aucune demande d’habilitation en attente'
  })
})
