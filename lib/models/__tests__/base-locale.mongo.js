const test = require('ava')
const {MongoMemoryServer} = require('mongodb-memory-server')
const mongo = require('../../util/mongo')
const BaseLocale = require('../base-locale')
const {mockBan54} = require('../../populate/__mocks__/ban')

const mongod = new MongoMemoryServer()

test.before('start server', async () => {
  await mongo.connect(await mongod.getUri())
})

test.after.always('cleanup', async () => {
  await mongo.disconnect()
  await mongod.stop()
})

test('create a BaseLocale', async t => {
  const baseLocale = await BaseLocale.create({
    nom: 'foo',
    description: 'bar',
    emails: ['me@domain.co'],
    enableComplement: false
  })
  const keys = ['nom', 'description', 'status', 'emails', 'token', '_updated', '_created', '_id', 'communes', 'enableComplement']
  t.true(keys.every(k => k in baseLocale))
  t.true(baseLocale.status === 'draft')
  t.is(Object.keys(baseLocale).length, 10)
})

test('create a BaseLocale / minimal', async t => {
  const baseLocale = await BaseLocale.create({
    emails: ['me@domain.co']
  })
  const keys = ['nom', 'description', 'status', 'emails', 'token', '_updated', '_created', '_id', 'communes', 'enableComplement']
  t.true(keys.every(k => k in baseLocale))
  t.is(Object.keys(baseLocale).length, 10)
})

test('create a BaseLocale / test', async t => {
  const baseLocale = await BaseLocale.create({
    isTest: true
  })
  const keys = ['isTest', 'nom', 'description', 'status', 'token', '_updated', '_created', '_id', 'communes']
  t.true(keys.every(k => k in baseLocale))
  t.is(Object.keys(baseLocale).length, 9)
  t.is(baseLocale.nom, 'Base locale [TEST]')
})

test('update a BaseLocale', async t => {
  const _id = new mongo.ObjectID()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    nom: 'foo',
    description: 'bar',
    emails: ['me@domain.co', 'me2@domain.co'],
    enableComplement: false,
    communes: [],
    token: 'coucou',
    status: 'draft',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01')
  })

  const baseLocale = await BaseLocale.update(_id, {
    nom: 'foo2',
    description: 'bar2',
    emails: ['me2@domain.co', 'me3@domain.co'],
    enableComplement: false,
    status: 'ready-to-publish',
    token: 'hack'
  })

  t.is(baseLocale.nom, 'foo2')
  t.is(baseLocale.description, 'bar2')
  t.deepEqual(baseLocale.emails, ['me2@domain.co', 'me3@domain.co'])
  t.is(baseLocale.enableComplement, false)
  t.is(baseLocale.token, 'coucou')
  t.is(baseLocale.status, 'ready-to-publish')
  t.is(Object.keys(baseLocale).length, 10)
})

test('update a BaseLocale / not found', t => {
  const _id = new mongo.ObjectID()
  return t.throwsAsync(() => BaseLocale.update(_id, {nom: 'foo'}), {message: 'BaseLocale not found'})
})

test('remove a BaseLocale', async t => {
  const _id = new mongo.ObjectID()
  await mongo.db.collection('bases_locales').insertOne({_id, nom: 'foo'})
  await mongo.db.collection('voies').insertOne({_bal: _id, nom: 'foo'})
  await mongo.db.collection('numeros').insertOne({_bal: _id, numero: 1})

  await BaseLocale.remove(_id)

  t.falsy(await mongo.db.collection('bases_locales').findOne({_id}))
  t.falsy(await mongo.db.collection('voies').findOne({_bal: _id}))
  t.falsy(await mongo.db.collection('numeros').findOne({_bal: _id}))
})

test('cleanContent', async t => {
  const _id = new mongo.ObjectID()
  await mongo.db.collection('bases_locales').insertOne({_id, nom: 'foo'})
  await mongo.db.collection('voies').insertOne({_bal: _id, nom: 'foo'})
  await mongo.db.collection('numeros').insertOne({_bal: _id, numero: 1})

  await BaseLocale.cleanContent(_id)

  t.truthy(await mongo.db.collection('bases_locales').findOne({_id}))
  t.falsy(await mongo.db.collection('voies').findOne({_bal: _id}))
  t.falsy(await mongo.db.collection('numeros').findOne({_bal: _id}))
})

test('renew token', async t => {
  const _id = new mongo.ObjectID()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    token: 'coucou',
    emails: ['toto@domain.co']
  })

  const baseLocale = await BaseLocale.renewToken(_id)

  t.not(baseLocale.token, 'coucou')
  t.is(baseLocale.token.length, 20)
})

test('add a commune', async t => {
  const _id = new mongo.ObjectID()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    token: 'coucou',
    communes: ['12345']
  })

  const baseLocale = await BaseLocale.addCommune(_id, '54084')

  t.deepEqual(baseLocale.communes, ['12345', '54084'])
})

test('add a commune / invalid code commune', async t => {
  const _id = new mongo.ObjectID()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    token: 'coucou',
    communes: ['12345']
  })

  await t.throwsAsync(() => BaseLocale.addCommune(_id, '00000'))
})

test('clean a commune', async t => {
  const _id = new mongo.ObjectID()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    token: 'coucou',
    communes: ['54084']
  })
  await mongo.db.collection('voies').insertOne({_bal: _id, nom: 'foo', commune: '54084'})
  await mongo.db.collection('numeros').insertOne({_bal: _id, numero: 1, commune: '54084'})

  const baseLocale = await BaseLocale.cleanCommune(_id, '54084')

  t.deepEqual(baseLocale.communes, ['54084'])
  t.falsy(await mongo.db.collection('voies').findOne({_bal: _id, commune: '54084'}))
  t.falsy(await mongo.db.collection('numeros').findOne({_bal: _id, commune: '54084'}))
})

test('remove a commune', async t => {
  const _id = new mongo.ObjectID()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    token: 'coucou',
    communes: ['54084']
  })
  await mongo.db.collection('voies').insertOne({_bal: _id, nom: 'foo', commune: '54084'})
  await mongo.db.collection('numeros').insertOne({_bal: _id, numero: 1, commune: '54084'})

  const baseLocale = await BaseLocale.removeCommune(_id, '54084')

  t.deepEqual(baseLocale.communes, [])
  t.falsy(await mongo.db.collection('voies').findOne({_bal: _id, commune: '54084'}))
  t.falsy(await mongo.db.collection('numeros').findOne({_bal: _id, commune: '54084'}))
})

test('populate a commune', async t => {
  const _id = new mongo.ObjectID()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    token: 'coucou',
    communes: ['54084']
  })
  await mongo.db.collection('voies').insertOne({_bal: _id, nom: 'foo', commune: '54084'})
  await mongo.db.collection('numeros').insertOne({_bal: _id, numero: 1, commune: '54084'})

  mockBan54()
  const baseLocale = await BaseLocale.populateCommune(_id, '54084')

  t.deepEqual(baseLocale.communes, ['54084'])

  const voie = await mongo.db.collection('voies').findOne({_bal: _id, commune: '54084', nom: 'allée des acacias'})
  t.truthy(voie)
  t.is(await mongo.db.collection('numeros').countDocuments({_bal: _id, voie: voie._id, commune: '54084'}), 49)
  t.is(await mongo.db.collection('voies').countDocuments({_bal: _id, commune: '54084'}), 20)
  t.is(await mongo.db.collection('numeros').countDocuments({_bal: _id, commune: '54084'}), 445)
  t.is((await mongo.db.collection('numeros').distinct('voie', {_bal: _id, commune: '54084'})).length, 20)
})

test('find Bases Locales by code departement', async t => {
  const _id = new mongo.ObjectID()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    token: 'coucou',
    communes: ['54084']
  })

  const basesLocales = await BaseLocale.fetchByCodeDepartement(54)
  t.truthy(basesLocales.map(({communes}) => communes.includes('54084')))
})

test('find Bases Locales by code departement / with 2 BAL', async t => {
  const _idBalA = new mongo.ObjectID()
  const _idBalB = new mongo.ObjectID()

  await mongo.db.collection('bases_locales').insertOne({
    _idBalA,
    token: 'coucou',
    communes: ['54084']
  })

  await mongo.db.collection('bases_locales').insertOne({
    _idBalB,
    token: 'coucou',
    communes: ['54222']
  })

  const basesLocales = await BaseLocale.fetchByCodeDepartement(54)
  t.truthy(basesLocales.map(({communes}) => communes.includes(['54084', '54222'])))
})

test('find Bases Locales by code departement / no BAL found', async t => {
  const _id = new mongo.ObjectID()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    token: 'coucou',
    communes: ['54084']
  })

  return t.throwsAsync(() => BaseLocale.fetchByCodeDepartement(57), {message: 'Aucune Base Locale trouvée'})
})

test('find Bases Locales by code departement / invalid code', async t => {
  const _id = new mongo.ObjectID()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    token: 'coucou',
    communes: ['54084']
  })

  return t.throwsAsync(() => BaseLocale.fetchByCodeDepartement(20), {message: 'Aucun département trouvé'})
})
