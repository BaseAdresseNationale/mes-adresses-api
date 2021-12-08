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
    .post(`/bases-locales/${_id}/habilitation`)
    .set({Authorization: 'Token coucou'})

  t.is(status, 200)
  t.deepEqual(body, {
    _id: 'xxxxxxxxxx',
    codeCommune: '27115',
    emailCommune: 'email@commune.fr',
    strategy: null,
    client: {},
    status: 'pending',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    expiresAt: null
  })
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
    _habilitation: 'aaaaa',
    _created: now,
    _updated: now
  })

  nock(process.env.API_DEPOT_URL, {
    reqheaders: {
      authorization: `Token ${process.env.API_DEPOT_TOKEN}`,
    },
  })
    .get('/habilitations/aaaaa')
    .reply(200, {
      _id: 'aaaaa',
      codeCommune: '27115',
      status: 'accepted',
      expiresAt: '3000-01-01T00:00:00.000Z'
    })

  const {status, body} = await request(getApp())
    .post(`/bases-locales/${_id}/habilitation`)
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
    _habilitation: 'bbbbb',
    _created: now,
    _updated: now
  })

  nock(process.env.API_DEPOT_URL, {
    reqheaders: {
      authorization: `Token ${process.env.API_DEPOT_TOKEN}`,
    },
  })
    .get('/habilitations/bbbbb')
    .reply(200, {
      _id: 'bbbbb',
      codeCommune: '27115',
      status: 'accepted',
      expiresAt: lastYear.toISOString()
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
    .post(`/bases-locales/${_id}/habilitation`)
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
    _habilitation: 'ccccc',
    _created: now,
    _updated: now
  })

  nock(process.env.API_DEPOT_URL, {
    reqheaders: {
      authorization: `Token ${process.env.API_DEPOT_TOKEN}`,
    },
  })
    .get('/habilitations/ccccc')
    .reply(200, {
      _id: 'ccccc',
      codeCommune: '27115',
      status: 'pending',
      expiresAt: '3000-01-01T00:00:00.000Z'
    })

  nock(process.env.API_DEPOT_URL, {
    reqheaders: {
      authorization: `Token ${process.env.API_DEPOT_TOKEN}`,
    },
  })
    .post('/habilitations/ccccc/authentication/email/send-pin-code')
    .reply(200, {code: 200, message: 'OK'})

  const {status} = await request(getApp())
    .post(`/bases-locales/${_id}/habilitation/email/send-pin-code`)
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
    .post(`/bases-locales/${_id}/habilitation/email/send-pin-code`)
    .set({Authorization: 'Token coucou'})

  t.is(status, 404)
  t.deepEqual(body, {
    code: 404,
    message: 'Aucune habilitation actuellement rattachée'
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
    _habilitation: 'ddddd',
    token: 'coucou',
    _created: now,
    _updated: now
  })

  nock(process.env.API_DEPOT_URL, {
    reqheaders: {
      authorization: `Token ${process.env.API_DEPOT_TOKEN}`,
    },
  })
    .get('/habilitations/ddddd')
    .reply(200, {
      _id: 'ddddd',
      codeCommune: '27115',
      status: 'accepted',
      expiresAt: '3000-01-01T00:00:00.000Z'
    })

  const {status, body} = await request(getApp())
    .post(`/bases-locales/${_id}/habilitation/email/send-pin-code`)
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
  const nextYear = new Date(new Date().setFullYear(now.getFullYear() + 1))

  await mongo.db.collection('bases_locales').insertOne({
    _id,
    nom: 'foo',
    emails: ['me@domain.co'],
    communes: ['27115'],
    _habilitation: 'eeeee',
    token: 'coucou',
  })

  nock(process.env.API_DEPOT_URL, {
    reqheaders: {
      authorization: `Token ${process.env.API_DEPOT_TOKEN}`,
    },
  })
    .get('/habilitations/eeeee')
    .reply(200, {
      _id: 'eeeee',
      codeCommune: '27115',
      status: 'pending'
    })

  nock(process.env.API_DEPOT_URL, {
    reqheaders: {
      authorization: `Token ${process.env.API_DEPOT_TOKEN}`,
    },
  })
    .post('/habilitations/eeeee/authentication/email/validate-pin-code', {
      code: '1234'
    })
    .reply(200, {
      _id: 'eeeee',
      status: 'accepted',
      strategy: {type: 'email'},
      createdAt: now,
      updatedAt: now,
      expiresAt: nextYear
    })

  const {status, body} = await request(getApp())
    .post(`/bases-locales/${_id}/habilitation/email/validate-pin-code`)
    .set({Authorization: 'Token coucou'})
    .send({code: '1234'})

  t.is(status, 200)
  t.deepEqual(body, JSON.parse(JSON.stringify({
    _id: 'eeeee',
    status: 'accepted',
    strategy: {type: 'email'},
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    expiresAt: nextYear
  })))
})

test.serial('validate habilitation code / no code', async t => {
  const _id = new mongo.ObjectID()
  const now = new Date()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    nom: 'foo',
    emails: ['me@domain.co'],
    communes: ['27115'],
    _habilitation: 'fffff',
    token: 'coucou',
    _created: now,
    _updated: now
  })

  nock(process.env.API_DEPOT_URL, {
    reqheaders: {
      authorization: `Token ${process.env.API_DEPOT_TOKEN}`,
    },
  })
    .get('/habilitations/fffff')
    .reply(200, {
      _id: 'fffff',
      codeCommune: '27115',
      status: 'pending'
    })

  const {status, body} = await request(getApp())
    .post(`/bases-locales/${_id}/habilitation/email/validate-pin-code`)
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
    .post(`/bases-locales/${_id}/habilitation/email/validate-pin-code`)
    .set({Authorization: 'Token coucou'})
    .send({code: '1234'})

  t.is(status, 404)
  t.deepEqual(body, {
    code: 404,
    message: 'Aucune habilitation actuellement rattachée'
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
    _habilitation: 'ggggg',
    token: 'coucou',
    _created: now,
    _updated: now
  })

  nock(process.env.API_DEPOT_URL, {
    reqheaders: {
      authorization: `Token ${process.env.API_DEPOT_TOKEN}`,
    },
  })
    .get('/habilitations/ggggg')
    .reply(200, {
      _id: 'ggggg',
      codeCommune: '27115',
      status: 'accepted',
      expiresAt: '3000-01-01T00:00:00.000Z'
    })

  const {status, body} = await request(getApp())
    .post(`/bases-locales/${_id}/habilitation/email/validate-pin-code`)
    .set({Authorization: 'Token coucou'})
    .send({code: '1234'})

  t.is(status, 412)
  t.deepEqual(body, {
    code: 412,
    message: 'Aucune demande d’habilitation en attente'
  })
})
