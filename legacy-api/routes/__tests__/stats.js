const test = require('ava')
const request = require('supertest')
const express = require('express')
const {MongoMemoryServer} = require('mongodb-memory-server')
const mongo = require('../../util/mongo')
const {prepareContoursCommunes} = require('../../util/contours-communes')
const routes = require('../stats')

function getApp() {
  const app = express()
  app.use(routes)
  return app
}

const SAFE_FIELDS = ['nom', '_updated', '_created', '_id', 'commune']

let mongod

test.before('start server', async () => {
  mongod = await MongoMemoryServer.create()
  await mongo.connect(mongod.getUri())
})

test.before('prepare contours communes', async () => {
  await prepareContoursCommunes()
})

test.after.always('cleanup', async () => {
  await mongo.disconnect()
  await mongod.stop()
})

test.beforeEach('clean database', async () => {
  await mongo.db.collection('bases_locales').deleteMany({})
})

test.serial('get Bases Locales with a code departement', async t => {
  const _idBalA = new mongo.ObjectId()
  const _idBalB = new mongo.ObjectId()
  const _idBalC = new mongo.ObjectId()

  await mongo.db.collection('bases_locales').insertOne({
    _id: _idBalA,
    nom: 'foo',
    emails: ['me@domain.co'],
    commune: '54084',
    token: 'coucou',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })

  await mongo.db.collection('bases_locales').insertOne({
    _id: _idBalB,
    nom: 'fobaro',
    emails: ['you@domain.tld'],
    commune: '54222',
    token: 'hello',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })

  await mongo.db.collection('bases_locales').insertOne({
    _id: _idBalC,
    nom: 'fobaro',
    emails: ['you@domain.tld'],
    commune: '33345',
    token: 'hello',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })

  const {body, status} = await request(getApp())
    .get('/departements/54')
  t.is(status, 200)
  t.is(body.basesLocales.length, 2)
  t.true(SAFE_FIELDS.every(k => k in body.basesLocales[0]))
  t.is(Object.keys(body.basesLocales[0]).length, SAFE_FIELDS.length)
})

test.serial('get Bases Locales with code departement / invalid code departement', async t => {
  const _id = new mongo.ObjectId()

  await mongo.db.collection('bases_locales').insertOne({
    _id,
    nom: 'foo',
    emails: ['me@domain.co'],
    commune: '54084',
    token: 'coucou',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })

  const {status, body} = await request(getApp())
    .get('/departements/20')
  t.is(status, 404)
  t.is(body.code, 404)
  t.is(body.message, 'Le département 20 n’existe pas.')
})

test.serial('get Bases Locales created within the dates passed in req', async t => {
  await mongo.db.collection('bases_locales').insertOne({
    _id: new mongo.ObjectId(),
    nom: 'BAL 1',
    emails: ['me@domain.co'],
    commune: '54084',
    token: 'coucou',
    status: 'ready-to-publish',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })

  await mongo.db.collection('bases_locales').insertOne({
    _id: new mongo.ObjectId(),
    nom: 'BAL 2',
    emails: ['me@domain.co'],
    commune: '37003',
    token: 'coucou',
    status: 'draft',
    _created: new Date('2019-01-02'),
    _updated: new Date('2019-01-02')
  })

  await mongo.db.collection('bases_locales').insertOne({
    _id: new mongo.ObjectId(),
    nom: 'BAL 3',
    emails: ['me@domain.co'],
    commune: '37003',
    token: 'coucou',
    status: 'published',
    _created: new Date('2019-01-02'),
    _updated: new Date('2019-01-02')
  })

  const {status, body} = await request(getApp())
    .get('/creations?from=2019-01-01&to=2019-01-03')
  const expectedResponse0 = {
    date: '2019-01-01',
    createdBAL: {
      54084: {
        total: 1,
        published: 0,
        draft: 0,
        readyToPublish: 1,
        demo: 0
      }
    }
  }
  const expectedResponse1 = {
    date: '2019-01-02',
    createdBAL: {
      37003: {
        total: 2,
        published: 1,
        draft: 1,
        readyToPublish: 0,
        demo: 0
      }
    }
  }
  t.is(status, 200)
  t.deepEqual(body[0], expectedResponse0)
  t.deepEqual(body[1], expectedResponse1)
  t.is(body.length, 2)
})
