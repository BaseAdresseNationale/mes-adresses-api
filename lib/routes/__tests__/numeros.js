const test = require('ava')
const {MongoMemoryServer} = require('mongodb-memory-server')
const express = require('express')
const request = require('supertest')
const {omit} = require('lodash')
const {getLabel} = require('@etalab/bal')
const mongo = require('../../util/mongo')
const routes = require('..')

const GENERATED_VARS = ['_id', '_updated', '_created']
const KEYS = ['_id', '_bal', 'commune', 'voie', 'numero', 'numeroComplet', 'positions', 'suffixe', '_created', '_updated', 'comment', 'toponyme', 'parcelles', 'certifie']

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
  await mongo.db.collection('numeros').deleteMany({})
})

function getApp() {
  const app = express()
  app.use(routes)
  return app
}

test.serial('create a numero', async t => {
  const _idVoie = new mongo.ObjectId()
  const _idBal = new mongo.ObjectId()
  await mongo.db.collection('bases_locales').insertOne({
    _id: _idBal,
    nom: 'foo',
    emails: ['me@domain.tld'],
    commune: '12345',
    token: 'coucou',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })
  await mongo.db.collection('voies').insertOne({
    _id: _idVoie,
    _bal: _idBal,
    commune: '12345',
    nom: 'voie',
    code: null,
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })

  const {status, body} = await request(getApp())
    .post(`/voies/${_idVoie}/numeros`)
    .set({Authorization: 'Token coucou'})
    .send({numero: 42})

  t.is(status, 201)
  t.deepEqual(omit(body, GENERATED_VARS), {
    _bal: _idBal.toHexString(),
    voie: _idVoie.toHexString(),
    commune: '12345',
    numero: 42,
    numeroComplet: '42',
    suffixe: null,
    positions: [],
    comment: null,
    toponyme: null,
    parcelles: [],
    certifie: false
  })
  t.true(KEYS.every(k => k in body))
  t.is(Object.keys(body).length, KEYS.length)
})

test.serial('create a numero / invalid payload', async t => {
  const _idVoie = new mongo.ObjectId()
  const _idBal = new mongo.ObjectId()
  await mongo.db.collection('bases_locales').insertOne({
    _id: _idBal,
    nom: 'foo',
    emails: ['me@domain.tld'],
    commune: '12345',
    token: 'coucou',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })
  await mongo.db.collection('voies').insertOne({
    _id: _idVoie,
    _bal: _idBal,
    commune: '12345',
    nom: 'voie',
    code: null,
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })

  const {status, body} = await request(getApp())
    .post(`/voies/${_idVoie}/numeros`)
    .set({Authorization: 'Token coucou'})
    .send({numero: 'invalid numero'})

  t.is(status, 400)
  t.deepEqual(body, {
    code: 400,
    message: 'Invalid payload',
    validation: {
      numero: ['Le champ numero doit être de type "number"']
    }
  })
})

test.serial('create a numero / invalid voie', async t => {
  const {status} = await request(getApp())
    .post('/voies/42/numeros')
    .set({Authorization: 'Token coucou'})
    .send({numero: 42})

  t.is(status, 404)
})

test.serial('create a numero / invalid parcelles', async t => {
  const _idVoie = new mongo.ObjectId()
  const _idBal = new mongo.ObjectId()
  await mongo.db.collection('bases_locales').insertOne({
    _id: _idBal,
    nom: 'foo',
    emails: ['me@domain.tld'],
    commune: '12345',
    token: 'coucou',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })
  await mongo.db.collection('voies').insertOne({
    _id: _idVoie,
    _bal: _idBal,
    commune: '12345',
    nom: 'voie',
    code: null,
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })

  const {status, body} = await request(getApp())
    .post(`/voies/${_idVoie}/numeros`)
    .set({Authorization: 'Token coucou'})
    .send({numero: 42, parcelles: ['invalid']})

  t.is(status, 400)
  t.deepEqual(body, {
    code: 400,
    message: 'Invalid payload',
    validation: {
      parcelles: [
        getLabel('cad_parcelles.valeur_invalide')
      ]
    }
  })
})

test.serial('create a numero / without admin token', async t => {
  const _idVoie = new mongo.ObjectId()
  const _idBal = new mongo.ObjectId()
  await mongo.db.collection('bases_locales').insertOne({
    _id: _idBal,
    nom: 'foo',
    emails: ['me@domain.tld'],
    commune: '12345',
    token: 'coucou',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })
  await mongo.db.collection('voies').insertOne({
    _id: _idVoie,
    _bal: _idBal,
    commune: '12345',
    nom: 'voie',
    code: null,
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })

  const {status} = await request(getApp())
    .post(`/voies/${_idVoie}/numeros`)
    .send({numero: 42})

  t.is(status, 403)
})

test.serial('get all numeros from a voie', async t => {
  const _idVoie = new mongo.ObjectId()
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
  await mongo.db.collection('voies').insertOne({
    _id: _idVoie,
    _bal: _idBal,
    commune: '12345',
    nom: 'voie',
    code: null,
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })
  await mongo.db.collection('numeros').insertOne({
    _id,
    _bal: _idBal,
    commune: '12345',
    voie: _idVoie,
    numero: 42,
    suffixe: null,
    positions: [],
    comment: 'Bonjour !',
    toponyme: null,
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })

  const {status, body} = await request(getApp())
    .get(`/voies/${_idVoie}/numeros`)
    .set({Authorization: 'Token coucou'})

  t.is(status, 200)
  t.is(body.length, 1)
  t.is(body[0].comment, 'Bonjour !')
})

test.serial('get all numeros from a voie / without token', async t => {
  const _idVoie = new mongo.ObjectId()
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
  await mongo.db.collection('voies').insertOne({
    _id: _idVoie,
    _bal: _idBal,
    commune: '12345',
    nom: 'voie',
    code: null,
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })
  await mongo.db.collection('numeros').insertOne({
    _id,
    _bal: _idBal,
    commune: '12345',
    voie: _idVoie,
    numero: 42,
    suffixe: null,
    positions: [],
    comment: 'Bonjour !',
    toponyme: null,
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })

  const {status, body} = await request(getApp())
    .get(`/voies/${_idVoie}/numeros`)

  t.is(status, 200)
  t.is(body.length, 1)
  t.is(body[0].comment, undefined)
})

test.serial('get all numeros from a voie / invalid voie', async t => {
  const {status} = await request(getApp())
    .get('/voies/42/numeros')

  t.is(status, 404)
})

test.serial('get all numeros from a toponyme', async t => {
  const _idVoie = new mongo.ObjectId()
  const _idBal = new mongo.ObjectId()
  const _idToponyme = new mongo.ObjectId()
  const _idNumeroA = new mongo.ObjectId()
  const _idNumeroB = new mongo.ObjectId()
  await mongo.db.collection('bases_locales').insertOne({
    _id: _idBal,
    nom: 'foo',
    emails: ['me@domain.tld'],
    commune: '12345',
    token: 'coucou',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })
  await mongo.db.collection('voies').insertOne({
    _id: _idVoie,
    _bal: _idBal,
    commune: '12345',
    nom: 'voie',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })
  await mongo.db.collection('toponymes').insertOne({
    _id: _idToponyme,
    _bal: _idBal,
    commune: '12345',
    nom: 'toponyme',
    positions: [],
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })
  await mongo.db.collection('numeros').insertOne({
    _id: _idNumeroA,
    _bal: _idBal,
    commune: '12345',
    voie: _idVoie,
    numero: 42,
    positions: [],
    parcelles: [],
    comment: 'Bonjour !',
    suffixe: 'bis',
    toponyme: _idToponyme,
    certifie: false,
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })
  await mongo.db.collection('numeros').insertOne({
    _id: _idNumeroB,
    _bal: _idBal,
    commune: '12345',
    voie: _idVoie,
    numero: 24,
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })

  const {status, body} = await request(getApp())
    .get(`/toponymes/${_idToponyme}/numeros`)
    .set({Authorization: 'Token coucou'})

  t.is(status, 200)
  t.is(body.length, 1)
  t.deepEqual(omit(body[0], GENERATED_VARS), {
    _bal: _idBal.toHexString(),
    commune: '12345',
    numero: 42,
    comment: 'Bonjour !',
    numeroComplet: '42bis',
    positions: [],
    parcelles: [],
    suffixe: 'bis',
    toponyme: _idToponyme.toHexString(),
    voie: {
      _id: _idVoie.toHexString(),
      nom: 'voie'
    },
    certifie: false
  })
  t.true(KEYS.every(k => k in body[0]))
  t.is(Object.keys(body[0]).length, KEYS.length)
  t.is(body[0].comment, 'Bonjour !')
})

test.serial('get all numeros from a toponyme / without token', async t => {
  const _idVoie = new mongo.ObjectId()
  const _idBal = new mongo.ObjectId()
  const _idToponyme = new mongo.ObjectId()
  const _idNumeroA = new mongo.ObjectId()
  const _idNumeroB = new mongo.ObjectId()
  await mongo.db.collection('bases_locales').insertOne({
    _id: _idBal,
    nom: 'foo',
    emails: ['me@domain.tld'],
    commune: '12345',
    token: 'coucou',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })
  await mongo.db.collection('voies').insertOne({
    _id: _idVoie,
    _bal: _idBal,
    commune: '12345',
    nom: 'voie',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })
  await mongo.db.collection('toponymes').insertOne({
    _id: _idToponyme,
    _bal: _idBal,
    commune: '12345',
    nom: 'toponyme',
    positions: [],
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })
  await mongo.db.collection('numeros').insertOne({
    _id: _idNumeroA,
    _bal: _idBal,
    commune: '12345',
    voie: _idVoie,
    numero: 42,
    positions: [],
    parcelles: [],
    comment: 'Bonjour !',
    suffixe: 'bis',
    toponyme: _idToponyme,
    certifie: false,
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })
  await mongo.db.collection('numeros').insertOne({
    _id: _idNumeroB,
    _bal: _idBal,
    commune: '12345',
    voie: _idVoie,
    numero: 24,
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })

  const {status, body} = await request(getApp())
    .get(`/toponymes/${_idToponyme}/numeros`)

  t.is(status, 200)
  t.is(body.length, 1)
  t.deepEqual(omit(body[0], GENERATED_VARS), {
    _bal: _idBal.toHexString(),
    commune: '12345',
    numero: 42,
    numeroComplet: '42bis',
    positions: [],
    parcelles: [],
    suffixe: 'bis',
    toponyme: _idToponyme.toHexString(),
    voie: {
      _id: _idVoie.toHexString(),
      nom: 'voie'
    },
    certifie: false
  })
  t.false(KEYS.every(k => k in body[0]))
  t.is(Object.keys(body[0]).length, KEYS.length - 1)
  t.is(body[0].comment, undefined)
})

test.serial('get all numeros from a toponyme / invalid toponyme', async t => {
  const {status} = await request(getApp())
    .get('/toponymes/42/numeros')

  t.is(status, 404)
})

test.serial('get a numero / no token', async t => {
  const _idVoie = new mongo.ObjectId()
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
  await mongo.db.collection('voies').insertOne({
    _id: _idVoie,
    _bal: _idBal,
    commune: '12345',
    nom: 'voie',
    code: null,
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })
  await mongo.db.collection('numeros').insertOne({
    _id,
    _bal: _idBal,
    commune: '12345',
    voie: _idVoie,
    numero: 42,
    suffixe: 'bis',
    positions: [],
    parcelles: [],
    comment: 'Bonjour !',
    toponyme: null,
    certifie: false,
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })

  const {status, body} = await request(getApp())
    .get(`/numeros/${_id}`)

  t.is(status, 200)
  t.deepEqual(omit(body, GENERATED_VARS), {
    _bal: _idBal.toHexString(),
    voie: _idVoie.toHexString(),
    commune: '12345',
    numero: 42,
    suffixe: 'bis',
    numeroComplet: '42bis',
    positions: [],
    parcelles: [],
    toponyme: null,
    certifie: false
  })
  t.false(KEYS.every(k => k in body))
  t.is(Object.keys(body).length, KEYS.length - 1)
  t.is(body.comment, undefined)
})

test.serial('get a numero / with token', async t => {
  const _idVoie = new mongo.ObjectId()
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
  await mongo.db.collection('voies').insertOne({
    _id: _idVoie,
    _bal: _idBal,
    commune: '12345',
    nom: 'voie',
    code: null,
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })
  await mongo.db.collection('numeros').insertOne({
    _id,
    _bal: _idBal,
    commune: '12345',
    voie: _idVoie,
    numero: 42,
    suffixe: 'bis',
    positions: [],
    parcelles: [],
    comment: 'Bonjour !',
    toponyme: null,
    certifie: false,
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })

  const {status, body} = await request(getApp())
    .get(`/numeros/${_id}`)
    .set({Authorization: 'Token coucou'})

  t.is(status, 200)
  t.deepEqual(omit(body, GENERATED_VARS), {
    _bal: _idBal.toHexString(),
    voie: _idVoie.toHexString(),
    commune: '12345',
    comment: 'Bonjour !',
    numero: 42,
    suffixe: 'bis',
    numeroComplet: '42bis',
    positions: [],
    parcelles: [],
    toponyme: null,
    certifie: false
  })
  t.true(KEYS.every(k => k in body))
  t.is(Object.keys(body).length, KEYS.length)
  t.is(body.comment, 'Bonjour !')
})

test.serial('get a numero / invalid numero', async t => {
  const {status} = await request(getApp())
    .get('/numeros/42')

  t.is(status, 404)
})

test.serial('modify a numero', async t => {
  const _idToponyme = new mongo.ObjectId()
  const _idVoie = new mongo.ObjectId()
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
  await mongo.db.collection('voies').insertOne({
    _id: _idVoie,
    _bal: _idBal,
    commune: '12345',
    nom: 'voie',
    code: null,
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })
  await mongo.db.collection('toponymes').insertOne({
    _id: _idToponyme,
    _bal: _idBal,
    commune: '12345',
    nom: 'Le Moulin',
    positions: [],
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })
  await mongo.db.collection('numeros').insertOne({
    _id,
    _bal: _idBal,
    commune: '12345',
    voie: _idVoie,
    numero: 42,
    suffixe: null,
    positions: [],
    comment: null,
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })

  const {status, body} = await request(getApp())
    .put(`/numeros/${_id}`)
    .set({Authorization: 'Token coucou'})
    .send({numero: 24, toponyme: _idToponyme.toHexString()})

  t.is(status, 200)
  t.is(body.numero, 24)
  t.is(body.toponyme, _idToponyme.toHexString())
})

test.serial('modify numeros by batch / certifie to true', async t => {
  const _idVoie = new mongo.ObjectId()
  const _idBal = new mongo.ObjectId()
  const _idNumeroA = new mongo.ObjectId()
  const _idNumeroB = new mongo.ObjectId()
  const _idNumeroC = new mongo.ObjectId()
  const _idNumeroD = new mongo.ObjectId()
  await mongo.db.collection('bases_locales').insertOne({
    _id: _idBal,
    nom: 'foo',
    emails: ['me@domain.tld'],
    commune: '12345',
    token: 'coucou',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })
  await mongo.db.collection('voies').insertOne({
    _id: _idVoie,
    _bal: _idBal,
    commune: '12345',
    nom: 'voie A',
    code: null,
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })
  await mongo.db.collection('numeros').insertMany([
    {
      _id: _idNumeroA,
      _bal: _idBal,
      commune: '12345',
      voie: _idVoie,
      numero: 42,
      positions: [],
      certifie: false,
      _created: new Date('2019-01-01'),
      _updated: new Date('2019-01-01')
    },
    {
      _id: _idNumeroB,
      _bal: _idBal,
      commune: '12345',
      voie: _idVoie,
      numero: 43,
      positions: [],
      certifie: false,
      _created: new Date('2019-01-01'),
      _updated: new Date('2019-01-01')
    },
    {
      _id: _idNumeroC,
      _bal: _idBal,
      commune: '12345',
      voie: _idVoie,
      numero: 42,
      positions: [],
      certifie: false,
      _created: new Date('2019-01-01'),
      _updated: new Date('2019-01-01')
    },
    {
      _id: _idNumeroD,
      _bal: _idBal,
      commune: '12345',
      voie: _idVoie,
      numero: 43,
      positions: [],
      certifie: false,
      _created: new Date('2019-01-01'),
      _updated: new Date('2019-01-01')
    }
  ])

  const {status, body} = await request(getApp())
    .post(`/bases-locales/${_idBal}/numeros/batch`)
    .set({Authorization: 'Token coucou'})
    .send({
      numerosIds: [
        _idNumeroA.toHexString(),
        _idNumeroB.toHexString(),
        _idNumeroC.toHexString(),
        _idNumeroD.toHexString()
      ],
      changes: {
        voie: _idVoie.toHexString(),
        certifie: true
      }
    })

  const numeroA = await mongo.db.collection('numeros').findOne({_id: _idNumeroA})
  const numeroB = await mongo.db.collection('numeros').findOne({_id: _idNumeroB})
  const numeroC = await mongo.db.collection('numeros').findOne({_id: _idNumeroC})
  const numeroD = await mongo.db.collection('numeros').findOne({_id: _idNumeroD})

  t.is(status, 200)
  t.is(body.modifiedCount, 4)
  t.true(numeroA.certifie)
  t.true(numeroB.certifie)
  t.true(numeroC.certifie)
  t.true(numeroD.certifie)
})

test.serial('modify a numero / invalid numero', async t => {
  const _idVoie = new mongo.ObjectId()
  const _idBal = new mongo.ObjectId()
  await mongo.db.collection('bases_locales').insertOne({
    _id: _idBal,
    nom: 'foo',
    emails: ['me@domain.tld'],
    commune: '12345',
    token: 'coucou',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })
  await mongo.db.collection('voies').insertOne({
    _id: _idVoie,
    _bal: _idBal,
    commune: '12345',
    nom: 'voie',
    code: null,
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })

  const {status} = await request(getApp())
    .put('/numeros/42')
    .set({Authorization: 'Token coucou'})
    .send({numero: 24})

  t.is(status, 404)
})

test.serial('modify a numero / invalid payload', async t => {
  const _idVoie = new mongo.ObjectId()
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
  await mongo.db.collection('voies').insertOne({
    _id: _idVoie,
    _bal: _idBal,
    commune: '12345',
    nom: 'voie',
    code: null,
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })
  await mongo.db.collection('numeros').insertOne({
    _id,
    _bal: _idBal,
    commune: '12345',
    voie: _idVoie,
    numero: 42,
    suffixe: null,
    positions: [],
    comment: null,
    toponyme: null,
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })

  const {status, body} = await request(getApp())
    .put(`/numeros/${_id}`)
    .set({Authorization: 'Token coucou'})
    .send({numero: 'invalid numero'})

  t.is(status, 400)
  t.deepEqual(body, {
    code: 400,
    message: 'Invalid payload',
    validation: {
      numero: ['Le champ numero doit être de type "number"']
    }
  })
})
test.serial('modify a numero / without admin token', async t => {
  const _idVoie = new mongo.ObjectId()
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
  await mongo.db.collection('voies').insertOne({
    _id: _idVoie,
    _bal: _idBal,
    commune: '12345',
    nom: 'voie',
    code: null,
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })
  await mongo.db.collection('numeros').insertOne({
    _id,
    _bal: _idBal,
    commune: '12345',
    voie: _idVoie,
    numero: 42,
    suffixe: null,
    positions: [],
    comment: null,
    toponyme: null,
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })

  const {status} = await request(getApp())
    .put(`/numeros/${_id}`)
    .send({numero: 'invalid numero'})

  t.is(status, 403)
  const numero = await mongo.db.collection('numeros').findOne({_id})
  t.is(numero.numero, 42)
})

test.serial('delete a numero', async t => {
  const _idVoie = new mongo.ObjectId()
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
  await mongo.db.collection('voies').insertOne({
    _id: _idVoie,
    _bal: _idBal,
    commune: '12345',
    nom: 'voie',
    code: null,
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })
  await mongo.db.collection('numeros').insertOne({
    _id,
    _bal: _idBal,
    commune: '12345',
    voie: _idVoie,
    numero: 42,
    suffixe: null,
    positions: [],
    comment: null,
    toponyme: null,
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })

  const {status} = await request(getApp())
    .delete(`/numeros/${_id}`)
    .set({Authorization: 'Token coucou'})

  t.is(status, 204)
  const numero = await mongo.db.collection('numeros').findOne({_id})
  t.falsy(numero)
})

test.serial('delete a numero / invalid numero', async t => {
  const {status} = await request(getApp())
    .delete('/numeros/42')

  t.is(status, 404)
})

test.serial('delete a numero / without admin token', async t => {
  const _idVoie = new mongo.ObjectId()
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
  await mongo.db.collection('voies').insertOne({
    _id: _idVoie,
    _bal: _idBal,
    commune: '12345',
    nom: 'voie',
    code: null,
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })
  await mongo.db.collection('numeros').insertOne({
    _id,
    _bal: _idBal,
    commune: '12345',
    voie: _idVoie,
    numero: 42,
    suffixe: null,
    positions: [],
    comment: null,
    toponyme: null,
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })

  const {status} = await request(getApp())
    .delete(`/numeros/${_id}`)

  t.is(status, 403)
})
