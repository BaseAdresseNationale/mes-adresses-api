const test = require('ava')
const request = require('supertest')
const express = require('express')
const {MongoMemoryServer} = require('mongodb-memory-server')
const mongo = require('../../util/mongo')
const {prepareContoursCommunes} = require('../../../lib/util/contours-communes')
const routes = require('../stats')

function getApp() {
  const app = express()
  app.use(routes)
  return app
}

const SAFE_FIELDS = ['nom', '_updated', '_created', '_id', 'communes', 'nbNumerosCertifies']

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
    communes: ['54084'],
    token: 'coucou',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })

  await mongo.db.collection('bases_locales').insertOne({
    _id: _idBalB,
    nom: 'fobaro',
    emails: ['you@domain.tld'],
    communes: ['54222'],
    token: 'hello',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })

  await mongo.db.collection('bases_locales').insertOne({
    _id: _idBalC,
    nom: 'fobaro',
    emails: ['you@domain.tld'],
    communes: ['33345'],
    token: 'hello',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })

  const {body, status} = await request(getApp())
    .get('/departements/54')
  t.is(status, 200)
  t.is(body.length, 2)
  t.true(SAFE_FIELDS.every(k => k in body[0]))
  t.is(Object.keys(body[0]).length, SAFE_FIELDS.length)
})

test.serial('get Bases Locales with code departement / invalid code departement', async t => {
  const _id = new mongo.ObjectId()

  await mongo.db.collection('bases_locales').insertOne({
    _id,
    nom: 'foo',
    emails: ['me@domain.co'],
    communes: ['54084'],
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

test.serial('get couverture BAL', async t => {
  const _idBalA = new mongo.ObjectId()
  const _idBalB = new mongo.ObjectId()
  const _idBalC = new mongo.ObjectId()

  await mongo.db.collection('bases_locales').insertOne({
    _id: _idBalA,
    nom: 'foo',
    emails: ['me@domain.co'],
    communes: ['54084'],
    status: 'ready-to-publish',
    token: 'coucou',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })

  await mongo.db.collection('bases_locales').insertOne({
    _id: _idBalB,
    nom: 'foo',
    emails: ['me@domain.co'],
    communes: ['57222'],
    status: 'draft',
    token: 'coucou',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })

  await mongo.db.collection('bases_locales').insertOne({
    _id: _idBalC,
    nom: 'foo',
    published: true,
    emails: ['me@domain.co'],
    communes: ['69123'],
    token: 'coucou',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })

  const {body, status} = await request(getApp())
    .get('/couverture-bal')

  t.is(status, 200)
  t.is(body.type, 'FeatureCollection')
  t.is(body.features.length, 3)
})
