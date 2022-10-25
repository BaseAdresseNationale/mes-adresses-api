const test = require('ava')
const {omit} = require('lodash')
const {MongoMemoryServer} = require('mongodb-memory-server')
const express = require('express')
const request = require('supertest')
const mongo = require('../../util/mongo')
const BaseLocale = require('../../models/base-locale')
const {mockBan54084} = require('../../populate/__mocks__/ban')
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

const GENERATED_VARS = ['_id', '_updated', '_created', 'token']
const KEYS = ['nom', 'emails', 'token', 'commune', 'nbNumeros', 'nbNumerosCertifies', 'isAllCertified', 'commentedNumeros', '_updated', '_created', '_deleted', '_id', 'status']
const SAFE_FIELDS = ['nom', 'commune', '_updated', 'nbNumeros', 'nbNumerosCertifies', 'isAllCertified', 'commentedNumeros', '_created', '_deleted', '_id']

test.serial('create a BaseLocale', async t => {
  const {body, status} = await request(getApp()).post('/bases-locales').send({
    nom: 'foo',
    emails: ['me@domain.co'],
    commune: '27115'
  })

  t.is(status, 201)
  t.deepEqual(omit(body, GENERATED_VARS), {
    nom: 'foo',
    emails: ['me@domain.co'],
    status: 'draft',
    commune: '27115',
    nbNumeros: 0,
    nbNumerosCertifies: 0,
    isAllCertified: false,
    commentedNumeros: [],
    _deleted: null
  })
  t.true(KEYS.every(k => k in body))
  t.is(Object.keys(body).length, KEYS.length)
})

test.serial('create a BaseLocale / invalid payload', async t => {
  const {status, body} = await request(getApp()).post('/bases-locales').send({})
  t.is(status, 400)
  t.deepEqual(body, {
    code: 400,
    message: 'Invalid payload',
    validation: {
      nom: [
        'Le champ nom est obligatoire'
      ],
      emails: [
        'Le champ emails est obligatoire'
      ],
      commune: [
        'Le champ commune est obligatoire'
      ]
    }
  })
})

test.serial('create a BaseLocale / invalid commune', async t => {
  const {status, body} = await request(getApp()).post('/bases-locales').send({
    nom: 'nom',
    emails: ['mail@domain.net'],
    commune: '00000'
  })
  t.is(status, 400)
  t.deepEqual(body, {
    code: 400,
    message: 'Invalid payload',
    validation: {
      commune: [
        'Code commune inconnu'
      ]
    }
  })
})

test.serial('get all BaseLocales', async t => {
  const _idBalA = new mongo.ObjectId()
  const _idBalB = new mongo.ObjectId()

  await mongo.db.collection('bases_locales').insertOne({
    _id: _idBalA,
    nom: 'foo',
    emails: ['me@domain.co'],
    commune: '27115',
    token: 'coucou',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01'),
    _deleted: null
  })

  await mongo.db.collection('bases_locales').insertOne({
    _id: _idBalB,
    nom: 'fobaro',
    emails: ['you@domain.tld'],
    commune: '27115',
    token: 'hello',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01'),
    _deleted: new Date('2020-01-01')
  })

  const {body, status} = await request(getApp())
    .get('/bases-locales')

  t.is(status, 200)
  t.is(body.length, 2)
  t.true(SAFE_FIELDS.every(k => k in body[0]))
  t.is(Object.keys(body[0]).length, SAFE_FIELDS.length)
})

test.serial('get a BaseLocal / with admin token', async t => {
  const _id = new mongo.ObjectId()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    nom: 'foo',
    emails: ['me@domain.co'],
    commune: '27115',
    status: 'draft',
    token: 'coucou',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01'),
    _deleted: null
  })

  const {body, status} = await request(getApp())
    .get(`/bases-locales/${_id}`).set({Authorization: 'Token coucou'})
  t.is(status, 200)
  t.true(KEYS.every(k => k in body))
  t.is(Object.keys(body).length, KEYS.length)
})

test.serial('get a BaseLocal / without admin token', async t => {
  const _id = new mongo.ObjectId()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    nom: 'foo',
    emails: ['me@domain.co'],
    commune: '27115',
    token: 'coucou',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01'),
    _deleted: null
  })

  const {body, status} = await request(getApp())
    .get(`/bases-locales/${_id}`)

  t.is(status, 200)
  t.true(SAFE_FIELDS.every(k => k in body))
  t.is(Object.keys(body).length, SAFE_FIELDS.length)
})

test.serial('get a BaseLocal / invalid id', async t => {
  const {status} = await request(getApp())
    .get('/bases-locales/42')

  t.is(status, 404)
})

test.serial('modify a BaseLocal / with admin token', async t => {
  const _id = new mongo.ObjectId()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    nom: 'foo',
    emails: ['me@domain.co'],
    commune: '27115',
    token: 'coucou',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })

  const {body, status} = await request(getApp())
    .put(`/bases-locales/${_id}`)
    .set({Authorization: 'Token coucou'})
    .send({nom: 'bar'})

  t.is(status, 200)
  t.is(body.nom, 'bar')
})

test.serial('modify numeros by batch / certifie to true', async t => {
  const _id = new mongo.ObjectId()
  const _idVoie = new mongo.ObjectId()
  const _idNumeroA = new mongo.ObjectId()
  const _idNumeroB = new mongo.ObjectId()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    nom: 'foo',
    emails: ['me@domain.co'],
    commune: '27115',
    token: 'coucou',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })
  await mongo.db.collection('voies').insertOne({
    _id,
    _bal: _idVoie,
    commune: '27115',
    nom: 'voie',
    code: null,
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })
  await mongo.db.collection('numeros').insertOne({
    _id: _idNumeroA,
    _bal: _id,
    commune: '27115',
    voie: _id,
    numero: 42,
    positions: [],
    certifie: false,
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })
  await mongo.db.collection('numeros').insertOne({
    _id: _idNumeroB,
    _bal: _id,
    commune: '27115',
    voie: _id,
    numero: 43,
    positions: [],
    certifie: false,
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })

  const {status, body} = await request(getApp())
    .post(`/bases-locales/${_id}/batch`)
    .set({Authorization: 'Token coucou'})
    .send({certifie: true})

  const numeroA = await mongo.db.collection('numeros').findOne({_id: _idNumeroA})
  const numeroB = await mongo.db.collection('numeros').findOne({_id: _idNumeroB})

  t.is(status, 200)
  t.is(body.modifiedCount, 2)
  t.true(numeroA.certifie)
  t.true(numeroB.certifie)
})

test.serial('modify a BaseLocal / without admin token', async t => {
  const _id = new mongo.ObjectId()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    nom: 'foo',
    emails: ['me@domain.co'],
    token: 'coucou',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })

  const {status} = await request(getApp()).put(`/bases-locales/${_id}`).send({nom: 'bar'})
  t.is(status, 403)
})

test.serial('modify a BaseLocal / invalid payload', async t => {
  const _id = new mongo.ObjectId()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    nom: 'foo',
    emails: ['me@domain.co'],
    token: 'coucou',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })

  const {status, body} = await request(getApp())
    .put(`/bases-locales/${_id}`)
    .set({Authorization: 'Token coucou'})
    .send({nom: '', emails: []})

  t.is(status, 400)
  t.deepEqual(body, {
    code: 400,
    message: 'Invalid payload',
    validation: {
      nom: ['Le nom est trop court (1 caractère minimum)'],
      emails: ['Le champ emails doit contenir au moins une adresse email']
    }
  })
})

test.serial('modify a BaseLocal / demo', async t => {
  const _id = new mongo.ObjectId()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    nom: 'foo',
    emails: ['me@domain.co'],
    commune: '27115',
    token: 'coucou',
    status: 'demo',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })

  const {body, status} = await request(getApp())
    .put(`/bases-locales/${_id}`)
    .set({Authorization: 'Token coucou'})
    .send({nom: 'bar', email: 'me@mail.co'})

  t.is(status, 403)
  t.deepEqual(body, {
    code: 403,
    message: 'Une Base Adresse Locale de démonstration ne peut pas être modifiée. Elle doit d’abord être transformée en brouillon.'
  })
})

test.serial('transform BaseLocal to draft / not a demo', async t => {
  const _id = new mongo.ObjectId()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    nom: 'foo',
    emails: ['me@domain.co'],
    commune: '27115',
    token: 'coucou',
    status: 'draft',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })

  const {body, status} = await request(getApp())
    .post(`/bases-locales/${_id}/transform-to-draft`)
    .set({Authorization: 'Token coucou'})
    .send({nom: 'bar', email: 'me@mail.co'})

  t.is(status, 403)
  t.deepEqual(body, {
    code: 403,
    message: 'La Base Adresse Locale n’est pas une Base Adresse Locale de démonstration'
  })
})

test.serial('delete a BaseLocal / with admin token', async t => {
  const _id = new mongo.ObjectId()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    nom: 'foo',
    emails: ['me@domain.co'],
    commune: '27115',
    token: 'coucou',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01'),
    _deleted: null
  })

  const {status} = await request(getApp())
    .delete(`/bases-locales/${_id}`)
    .set({Authorization: 'Token coucou'})

  t.is(status, 204)

  const baseLocale = await mongo.db.collection('bases_locales').findOne({_id})

  t.truthy(baseLocale._deleted)
  t.is(Object.keys(baseLocale).length, 8)
})

test.serial('delete a BaseLocal / without admin token', async t => {
  const _id = new mongo.ObjectId()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    nom: 'foo',
    emails: ['me@domain.co'],
    commune: '27115',
    token: 'coucou',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })

  const {status} = await request(getApp())
    .delete(`/bases-locales/${_id}`)

  t.is(status, 403)

  const baseLocal = await mongo.db.collection('bases_locales').findOne({_id})
  t.deepEqual(baseLocal, {
    _id,
    nom: 'foo',
    emails: ['me@domain.co'],
    commune: '27115',
    token: 'coucou',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })
})

test('Restore deleted BAL', async t => {
  const _id = new mongo.ObjectId()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    nom: 'foo',
    emails: ['me@domain.co'],
    commune: '27115',
    token: 'coucou',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-02-02'),
    _deleted: new Date('2019-02-02')
  })

  await request(getApp())
    .get(`/bases-locales/${_id}/coucou/recovery`)

  const baseLocale = await mongo.db.collection('bases_locales').findOne({_id})

  t.is(baseLocale._deleted, null)
})

test('Restore deleted BAL / invalid token', async t => {
  const _id = new mongo.ObjectId()
  const deletedDate = new Date('2019-02-02')
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    nom: 'foo',
    emails: ['me@domain.co'],
    commune: '27115',
    token: 'coucou',
    _created: new Date('2019-01-01'),
    _updated: deletedDate,
    _deleted: deletedDate
  })

  const {status} = await request(getApp())
    .get(`/bases-locales/${_id}/cou/recovery`)

  t.is(status, 403)

  const baseLocale = await mongo.db.collection('bases_locales').findOne({_id})

  t.deepEqual(baseLocale._deleted, deletedDate)
})

test('export as CSV', async t => {
  mockBan54084()
  const {_id} = await BaseLocale.create({nom: 'foo', commune: '54084', emails: ['toto@acme.co']},)
  await BaseLocale.populateCommune(_id, '54084')

  const {status, headers, text} = await request(getApp())
    .get(`/bases-locales/${_id}/csv`)

  t.is(status, 200)
  t.is(headers['content-disposition'], 'attachment; filename="bal.csv"')
  t.is(headers['content-type'], 'text/csv; charset=utf-8')
  t.is(text.split('\r\n').length, 488)
})

test('Export as GeoJSON', async t => {
  mockBan54084()
  const {_id} = await BaseLocale.create({nom: 'foo', commune: '54084', emails: ['toto@acme.co']})
  await BaseLocale.populateCommune(_id, '54084')

  const {status, headers, body} = await request(getApp())
    .get(`/bases-locales/${_id}/geojson`)

  t.is(status, 200)
  t.is(headers['content-type'], 'application/json; charset=utf-8')
  t.is(body.type, 'FeatureCollection')
  t.is(body.features.length, 486)
})

test.serial('renew token / with admin token', async t => {
  const _id = new mongo.ObjectId()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    nom: 'foo',
    emails: ['me@domain.co'],
    commune: '27115',
    token: 'coucou',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })

  const {status, body} = await request(getApp())
    .post(`/bases-locales/${_id}/token/renew`)
    .set({Authorization: 'Token coucou'})

  t.is(status, 200)
  t.not(body.token, 'coucou')
})

test.serial('renew token / invalid balId', async t => {
  const _id = new mongo.ObjectId()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    nom: 'foo',
    emails: ['me@domain.co'],
    commune: '27115',
    token: 'coucou',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })

  const {status} = await request(getApp())
    .post('/bases-locales/42/token/renew')
    .set({Authorization: 'Token coucou'})

  t.is(status, 404)
})

test.serial('renew token / without admin token', async t => {
  const _id = new mongo.ObjectId()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    nom: 'foo',
    emails: ['me@domain.co'],
    commune: '27115',
    token: 'coucou',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })

  const {status} = await request(getApp())
    .post(`/bases-locales/${_id}/token/renew`)

  t.is(status, 403)
  const baseLocal = await mongo.db.collection('bases_locales').findOne({_id})
  t.is(baseLocal.token, 'coucou')
})

test('Fetch Bases Locales by commune and email', async t => {
  const idBal1 = new mongo.ObjectId()
  const idBal2 = new mongo.ObjectId()

  await mongo.db.collection('bases_locales').insertOne({
    _id: idBal1,
    token: 'coucou',
    emails: ['living@data.com'],
    commune: '55326'
  })

  await mongo.db.collection('bases_locales').insertOne({
    _id: idBal2,
    token: 'coucou',
    emails: ['fetching@data.com'],
    commune: '55500'
  })

  const response = await request(getApp())
    .get('/bases-locales/search?commune=55326&email=living@data.com')

  t.is(response.status, 200)
  t.is(response.body.results.length, 1)
  t.is(response.body.results[0].email, undefined)
  t.is(response.body.results[0].commune, '55326')
})

test('get all assigned parcelles', async t => {
  const _id = new mongo.ObjectId()

  await mongo.db.collection('bases_locales').insertOne({
    _id,
    nom: 'foo',
    emails: ['me@domain.co'],
    commune: '55326',
    token: 'coucou',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })

  await mongo.db.collection('numeros').insertOne({
    _bal: _id,
    numero: 1,
    commune: '55326',
    parcelles: ['12345000AA0002']
  })

  await mongo.db.collection('toponymes').insertOne({
    _bal: _id,
    commune: '55326',
    parcelles: ['12345000AA0002', '12345000AA0005']
  })

  const {status, body} = await request(getApp())
    .get(`/bases-locales/${_id}/parcelles`)

  t.is(status, 200)
  t.is(body.length, 2)
  t.deepEqual(body, ['12345000AA0002', '12345000AA0005'])
})

test('Count numeros & certified numeros', async t => {
  const _id = new mongo.ObjectId()

  await mongo.db.collection('bases_locales').insertOne({
    _id,
    token: 'coucou',
    emails: ['living@data.com'],
    commune: '55325'
  })

  await mongo.db.collection('numeros').insertOne({_bal: _id, numero: 1, certifie: true})
  await mongo.db.collection('numeros').insertOne({_bal: _id, numero: 2, certifie: false})

  const {status, body} = await request(getApp())
    .get(`/bases-locales/${_id}`)

  t.is(status, 200)
  t.is(body._id, _id.toHexString())
  t.is(body.commune, '55325')
  t.is(body.nbNumeros, 2)
  t.is(body.nbNumerosCertifies, 1)
  t.false(body.isAllCertified)
})

test('Count numeros & certified numeros / certified all', async t => {
  const _id = new mongo.ObjectId()

  await mongo.db.collection('bases_locales').insertOne({
    _id,
    token: 'coucou',
    emails: ['living@data.com'],
    commune: '55325'
  })

  await mongo.db.collection('numeros').insertOne({_bal: _id, numero: 1, certifie: true})
  await mongo.db.collection('numeros').insertOne({_bal: _id, numero: 2, certifie: true})

  const {status, body} = await request(getApp())
    .get(`/bases-locales/${_id}`)

  t.is(status, 200)
  t.is(body._id, _id.toHexString())
  t.is(body.commune, '55325')
  t.is(body.nbNumeros, 2)
  t.is(body.nbNumerosCertifies, 2)
  t.true(body.isAllCertified)
})

test('Commented numeros', async t => {
  const _id = new mongo.ObjectId()

  await mongo.db.collection('bases_locales').insertOne({
    _id,
    token: 'coucou',
    emails: ['living@data.com'],
    commune: '55325'
  })

  await mongo.db.collection('numeros').insertOne({_bal: _id, numero: 1, comment: 'mon commentaire 1'})
  await mongo.db.collection('numeros').insertOne({_bal: _id, numero: 2, comment: 'mon commentaire 2'})

  const {status, body} = await request(getApp())
    .get(`/bases-locales/${_id}`)

  t.is(status, 200)
  t.is(body._id, _id.toHexString())
  t.is(body.commune, '55325')
  t.is(body.commentedNumeros.length, 2)
  t.is(body.commentedNumeros[0].comment, 'mon commentaire 1')
  t.is(body.commentedNumeros[1].comment, 'mon commentaire 2')
})
