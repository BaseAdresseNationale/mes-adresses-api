const test = require('ava')
const {MongoMemoryServer} = require('mongodb-memory-server')
const express = require('express')
const request = require('supertest')
const {omit} = require('lodash')
const mongo = require('../../util/mongo')
const routes = require('..')

const GENERATED_VARS = ['_id', '_updated', '_created']
const KEYS = ['_id', '_bal', 'nom', 'positions', 'parcelles', 'commune', 'nomAlt', '_created', '_updated', 'nbNumeros', 'nbNumerosCertifies', 'isAllCertified', 'commentedNumeros']

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
  await mongo.db.collection('toponymes').deleteMany({})
})

function getApp() {
  const app = express()
  app.use(routes)
  return app
}

test.serial('create a toponyme', async t => {
  const _id = new mongo.ObjectId()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    nom: 'foo',
    emails: ['me@domain.tld'],
    commune: '97125',
    token: 'coucou',
    _created: new Date('2021-01-01'),
    _updated: new Date('2021-01-01')
  })

  const {status, body} = await request(getApp())
    .post(`/bases-locales/${_id}/toponymes`)
    .set({Authorization: 'Token coucou'})
    .send({nom: 'la Pointe des Châteaux', nomAlt: {gcf: 'Lapwent'}})

  t.is(status, 201)
  t.deepEqual(omit(body, GENERATED_VARS), {
    _bal: _id.toHexString(),
    commune: '97125',
    nom: 'la Pointe des Châteaux',
    nomAlt: {gcf: 'Lapwent'},
    isAllCertified: false,
    nbNumeros: 0,
    nbNumerosCertifies: 0,
    commentedNumeros: [],
    positions: [],
    parcelles: []
  })
  t.true(KEYS.every(k => k in body))
  t.is(Object.keys(body).length, KEYS.length)
})

test.serial('create a toponyme / with 2 nomAlt', async t => {
  const _id = new mongo.ObjectId()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    nom: 'foo',
    emails: ['me@domain.tld'],
    commune: '97125',
    token: 'coucou',
    _created: new Date('2021-01-01'),
    _updated: new Date('2021-01-01')
  })

  const {status, body} = await request(getApp())
    .post(`/bases-locales/${_id}/toponymes`)
    .set({Authorization: 'Token coucou'})
    .send({nom: 'la Pointe des Châteaux', nomAlt: {gcf: 'Lapwent', bre: 'Ar Beg'}})

  t.is(status, 201)
  t.deepEqual(omit(body, GENERATED_VARS), {
    _bal: _id.toHexString(),
    commune: '97125',
    nom: 'la Pointe des Châteaux',
    nomAlt: {gcf: 'Lapwent', bre: 'Ar Beg'},
    isAllCertified: false,
    nbNumeros: 0,
    nbNumerosCertifies: 0,
    commentedNumeros: [],
    positions: [],
    parcelles: []
  })
  t.true(KEYS.every(k => k in body))
  t.is(Object.keys(body).length, KEYS.length)
})

test.serial('create a toponyme / with unsupported nomAlt', async t => {
  const _id = new mongo.ObjectId()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    nom: 'foo',
    emails: ['me@domain.tld'],
    commune: '97125',
    token: 'coucou',
    _created: new Date('2021-01-01'),
    _updated: new Date('2021-01-01')
  })

  const {status, body} = await request(getApp())
    .post(`/bases-locales/${_id}/toponymes`)
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

test.serial('create a toponyme / without nom', async t => {
  const _id = new mongo.ObjectId()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    nom: 'foo',
    emails: ['me@domain.tld'],
    commune: '12345',
    token: 'coucou',
    _created: new Date('2021-01-01'),
    _updated: new Date('2021-01-01')
  })

  const {status, body} = await request(getApp())
    .post(`/bases-locales/${_id}/toponymes`)
    .set({Authorization: 'Token coucou'})
    .send({positions: [{
      point: {type: 'Point', coordinates: [1, 1]},
      type: 'entrée',
      source: 'ban'
    }]
    })

  t.is(status, 400)
  t.deepEqual(body, {
    code: 400,
    message: 'Invalid payload',
    validation: {
      nom: ['Le champ nom est obligatoire']
    }
  })
})

test.serial('create a toponyme / invalid base locale', async t => {
  const {status} = await request(getApp())
    .post('/bases-locales/12345/communes/12345/toponymes')
    .set({Authorization: 'Token coucou'})
    .send({nom: 'toponyme'})

  t.is(status, 404)
})

test.serial('create a toponyme / without admin token', async t => {
  const _id = new mongo.ObjectId()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    nom: 'foo',
    emails: ['me@domain.tld'],
    commune: '12345',
    token: 'coucou',
    _created: new Date('2021-01-01'),
    _updated: new Date('2021-01-01')
  })

  const {status} = await request(getApp())
    .post(`/bases-locales/${_id}/toponymes`)
    .send({nom: 'toponyme'})

  t.is(status, 403)
  const toponymes = await mongo.db.collection('toponymes').find({}).toArray()
  t.deepEqual(toponymes, [])
})

test.serial('get all toponymes from a commune', async t => {
  const _idBalA = new mongo.ObjectId()
  const _idBalB = new mongo.ObjectId()
  const _idToponyeA = new mongo.ObjectId()
  const _idToponyeB = new mongo.ObjectId()
  const _idToponyeC = new mongo.ObjectId()
  await mongo.db.collection('bases_locales').insertOne({
    _id: _idBalA,
    nom: 'foo',
    emails: ['me@domain.tld'],
    commune: '12345',
    token: 'coucou',
    _created: new Date('2021-01-01'),
    _updated: new Date('2021-01-01')
  })
  await mongo.db.collection('toponymes').insertMany([{
    _idToponyeA,
    _bal: _idBalA,
    nom: 'toponymeA',
    commune: '12345',
    positions: [],
    parcelles: [],
    _created: new Date('2021-01-01'),
    _updated: new Date('2021-01-01')
  },
  {
    _idToponyeB,
    _bal: _idBalA,
    nom: 'toponymeB',
    commune: '12345',
    positions: [],
    parcelles: [],
    _created: new Date('2021-01-01'),
    _updated: new Date('2021-01-01')
  },
  {
    _idToponyeC,
    _bal: _idBalB,
    nom: 'toponymeB',
    commune: '67890',
    positions: [],
    parcelles: [],
    _created: new Date('2021-01-01'),
    _updated: new Date('2021-01-01')
  }])

  const {status, body} = await request(getApp())
    .get(`/bases-locales/${_idBalA}/toponymes`)

  t.is(status, 200)
  t.is(body.length, 2)
})

test.serial('get all toponymes from a commune / invalid base locale', async t => {
  const {status} = await request(getApp())
    .get('/bases-locales/42/communes/12345/toponymes')

  t.is(status, 404)
})

test.serial('get a toponyme', async t => {
  const _idBal = new mongo.ObjectId()
  const _id = new mongo.ObjectId()
  await mongo.db.collection('bases_locales').insertOne({
    _id: _idBal,
    nom: 'foo',
    emails: ['me@domain.tld'],
    commune: '12345',
    token: 'coucou',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })
  await mongo.db.collection('toponymes').insertOne({
    _id,
    _bal: _idBal,
    nom: 'toponyme',
    nomAlt: null,
    commune: '12345',
    positions: [],
    parcelles: [],
    _created: new Date('2021-01-01'),
    _updated: new Date('2021-01-01')
  })

  const {status, body} = await request(getApp())
    .get(`/toponymes/${_id}`)

  t.is(status, 200)
  t.deepEqual(omit(body, GENERATED_VARS), {
    _bal: _idBal.toHexString(),
    nom: 'toponyme',
    nomAlt: null,
    commune: '12345',
    isAllCertified: false,
    nbNumeros: 0,
    nbNumerosCertifies: 0,
    commentedNumeros: [],
    positions: [],
    parcelles: []
  })
  t.true(KEYS.every(k => k in body))
  t.is(Object.keys(body).length, KEYS.length)
})

test.serial('get a toponyme / invalid toponyme', async t => {
  const {status} = await request(getApp())
    .get('/toponymes/42')

  t.is(status, 404)
})

test.serial('modify a toponyme', async t => {
  const _idBal = new mongo.ObjectId()
  const _id = new mongo.ObjectId()
  await mongo.db.collection('bases_locales').insertOne({
    _id: _idBal,
    nom: 'foo',
    emails: ['me@domain.tld'],
    commune: '97125',
    token: 'coucou',
    _created: new Date('2021-01-01'),
    _updated: new Date('2021-01-01')
  })
  await mongo.db.collection('toponymes').insertOne({
    _id,
    _bal: _idBal,
    nom: 'toponyme',
    commune: '97125',
    positions: [],
    parcelles: [],
    _created: new Date('2021-01-01'),
    _updated: new Date('2021-01-01')
  })

  const {status, body} = await request(getApp())
    .put(`/toponymes/${_id}`)
    .set({Authorization: 'Token coucou'})
    .send({nom: 'la Pointe des Châteaux', nomAlt: {gcf: 'Lapwent'}})

  t.is(status, 200)
  t.is(body.nom, 'la Pointe des Châteaux')
  t.deepEqual(body.nomAlt, {gcf: 'Lapwent'})
})

test.serial('modify a toponyme / nom too short', async t => {
  const _idBal = new mongo.ObjectId()
  const _id = new mongo.ObjectId()
  await mongo.db.collection('bases_locales').insertOne({
    _id: _idBal,
    nom: 'foo',
    emails: ['me@domain.tld'],
    commune: '12345',
    token: 'coucou',
    _created: new Date('2021-01-01'),
    _updated: new Date('2021-01-01')
  })
  await mongo.db.collection('toponymes').insertOne({
    _id,
    _bal: _idBal,
    nom: 'toponyme',
    commune: '12345',
    positions: [],
    _created: new Date('2021-01-01'),
    _updated: new Date('2021-01-01')
  })

  const {status, body} = await request(getApp())
    .put(`/toponymes/${_id}`)
    .set({Authorization: 'Token coucou'})
    .send({nom: 'fo'})

  t.is(status, 400)
  t.deepEqual(body, {
    code: 400,
    message: 'Invalid payload',
    validation: {
      nom: ['Le nom du toponyme est trop court (3 caractères minimum)']
    }
  })
})

test.serial('delete a toponyme', async t => {
  const _idBal = new mongo.ObjectId()
  const _id = new mongo.ObjectId()
  await mongo.db.collection('bases_locales').insertOne({
    _id: _idBal,
    nom: 'foo',
    emails: ['me@domain.tld'],
    commune: '12345',
    token: 'coucou',
    _created: new Date('2021-01-01'),
    _updated: new Date('2021-01-01')
  })
  await mongo.db.collection('toponymes').insertOne({
    _id,
    _bal: _idBal,
    nom: 'toponyme',
    commune: '12345',
    positions: [],
    parcelles: [],
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

test.serial('soft-delete a toponyme', async t => {
  const _idBal = new mongo.ObjectId()
  const _id = new mongo.ObjectId()
  await mongo.db.collection('bases_locales').insertOne({
    _id: _idBal,
    nom: 'foo',
    emails: ['me@domain.tld'],
    commune: '12345',
    token: 'coucou',
    _created: new Date('2021-01-01'),
    _updated: new Date('2021-01-01')
  })
  await mongo.db.collection('toponymes').insertOne({
    _id,
    _bal: _idBal,
    nom: 'toponyme',
    commune: '12345',
    positions: [],
    parcelles: [],
    _created: new Date('2021-01-01'),
    _updated: new Date('2021-01-01')
  })

  const {status} = await request(getApp())
    .put(`/toponymes/${_id}/soft-delete`)
    .set({Authorization: 'Token coucou'})

  t.is(status, 200)
  const toponyme = await mongo.db.collection('toponymes').findOne({_id})
  t.not(toponyme._deleted, null)
})

test.serial('delete a toponyme / invalid toponyme', async t => {
  const {status} = await request(getApp())
    .delete('/toponymes/42')

  t.is(status, 404)
})

test.serial('delete a toponyme / without admin token', async t => {
  const _idBal = new mongo.ObjectId()
  const _id = new mongo.ObjectId()
  await mongo.db.collection('bases_locales').insertOne({
    _id: _idBal,
    nom: 'foo',
    emails: ['me@domain.tld'],
    commune: '12345',
    token: 'coucou',
    _created: new Date('2021-01-01'),
    _updated: new Date('2021-01-01')
  })
  await mongo.db.collection('toponymes').insertOne({
    _id,
    _bal: _idBal,
    nom: 'toponyme',
    commune: '12345',
    positions: [],
    parcelles: [],
    _created: new Date('2021-01-01'),
    _updated: new Date('2021-01-01')
  })

  const {status} = await request(getApp())
    .delete(`/toponymes/${_id}`)

  t.is(status, 403)
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

  await mongo.db.collection('toponymes').insertOne({
    _id,
    _bal: _balId,
    nom: 'toponyme',
    commune: '55325',
    positions: [],
    parcelles: [],
    _created: new Date('2021-01-01'),
    _updated: new Date('2021-01-01')
  })

  await mongo.db.collection('numeros').insertOne({_bal: _balId, toponyme: _id, numero: 1, certifie: true})
  await mongo.db.collection('numeros').insertOne({_bal: _balId, toponyme: _id, numero: 2, certifie: true})

  const {status, body} = await request(getApp())
    .get(`/toponymes/${_id}`)

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

  await mongo.db.collection('toponymes').insertOne({
    _id,
    _bal: _balId,
    nom: 'toponyme',
    commune: '55325',
    positions: [],
    parcelles: [],
    _created: new Date('2021-01-01'),
    _updated: new Date('2021-01-01')
  })

  await mongo.db.collection('numeros').insertOne({_bal: _balId, toponyme: _id, numero: 1, comment: 'mon commentaire 1'})
  await mongo.db.collection('numeros').insertOne({_bal: _balId, toponyme: _id, numero: 2, comment: 'mon commentaire 2'})

  const {status, body} = await request(getApp())
    .get(`/toponymes/${_id}`)

  t.is(status, 200)
  t.is(body._id, _id.toHexString())
  t.is(body.commune, '55325')
  t.is(body.commentedNumeros.length, 2)
  t.is(body.commentedNumeros[0].comment, 'mon commentaire 1')
  t.is(body.commentedNumeros[1].comment, 'mon commentaire 2')
})
