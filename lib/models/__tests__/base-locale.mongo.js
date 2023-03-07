const test = require('ava')
const {MongoMemoryServer} = require('mongodb-memory-server')
const subMonths = require('date-fns/subMonths')
const mongo = require('../../util/mongo')
const BaseLocale = require('../base-locale')
const {getAssignedParcelles} = require('../base-locale')
const {mockBan54084} = require('../../populate/__mocks__/ban')

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

test('create a BaseLocale', async t => {
  const baseLocale = await BaseLocale.create({
    nom: 'foo',
    emails: ['me@domain.co'],
    commune: '27115'
  })
  const keys = ['nom', 'status', 'emails', 'commune', 'token', '_updated', '_created', '_id', '_deleted']

  t.true(keys.every(k => k in baseLocale))
  t.true(baseLocale.status === 'draft')
  t.is(Object.keys(baseLocale).length, 9)
})

test('create a BaseLocale / minimal', async t => {
  const baseLocale = await BaseLocale.create({nom: 'foo', emails: ['me@domain.co'], commune: '27115'})
  const keys = ['nom', 'status', 'emails', 'commune', 'token', '_updated', '_created', '_id', '_deleted']

  t.true(keys.every(k => k in baseLocale))
  t.is(Object.keys(baseLocale).length, 9)
})

test('create a BaseLocale / without nom', async t => {
  const error = await t.throwsAsync(() => BaseLocale.create({commune: '27115', emails: ['me@domain.co']}))

  t.deepEqual(error.validation, {
    nom: ['Le champ nom est obligatoire']
  })

  t.is(error.message, 'Invalid payload')
})

test('create a BaseLocale / without commune', async t => {
  const error = await t.throwsAsync(() => BaseLocale.create({nom: 'foo', emails: ['me@domain.co']}))

  t.deepEqual(error.validation, {
    commune: ['Le champ commune est obligatoire']
  })

  t.is(error.message, 'Invalid payload')
})

test('create a BaseLocale / with invalid commune', async t => {
  const error = await t.throwsAsync(() => BaseLocale.create({nom: 'foo', commune: '00000', emails: ['me@domain.co']}))

  t.deepEqual(error.validation, {
    commune: ['Code commune inconnu']
  })

  t.is(error.message, 'Invalid payload')
})

test('create a BaseLocale / empty nom', async t => {
  const error = await t.throwsAsync(() => BaseLocale.create({nom: '', emails: ['me@domain.co'], commune: '27115'}))

  t.deepEqual(error.validation, {
    nom: ['Le nom est trop court (1 caractère minimum)']
  })

  t.is(error.message, 'Invalid payload')
})

test('create a BaseLocale / demo', async t => {
  const baseLocale = await BaseLocale.createDemo({
    commune: '27115',
    populate: false
  })
  const keys = ['nom', 'status', 'token', '_updated', '_created', '_deleted', '_id', 'commune']
  t.true(keys.every(k => k in baseLocale))
  t.is(Object.keys(baseLocale).length, 8)
  t.is(baseLocale.nom, 'Adresses de Breux-sur-Avre [démo]')
  t.is(baseLocale.commune, '27115')
  t.is(baseLocale.status, 'demo')
})

test('create a demo BaseLocale / invalid commune', async t => {
  try {
    await BaseLocale.createDemo({
      commune: '00000',
      populate: false
    })

    t.fail()
  } catch (error) {
    t.deepEqual(error.validation, {
      commune: ['Code commune inconnu']
    })

    t.is(error.message, 'Invalid payload')
  }
})

test('create a demo BaseLocale / no commune', async t => {
  try {
    await BaseLocale.createDemo({
      populate: false
    })

    t.fail()
  } catch (error) {
    t.deepEqual(error.validation, {
      commune: ['Le champ commune est obligatoire']
    })

    t.is(error.message, 'Invalid payload')
  }
})

test('create a BaseLocale / populate demo', async t => {
  mockBan54084()
  const baseLocale = await BaseLocale.createDemo({
    commune: '54084',
    populate: true
  })

  const voie = await mongo.db.collection('voies').findOne({_bal: baseLocale._id, commune: '54084'})
  t.truthy(voie)
})

test('update a BaseLocale', async t => {
  const _id = new mongo.ObjectId()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    nom: 'foo',
    commune: '27115',
    emails: ['me@domain.co', 'me2@domain.co'],
    token: 'coucou',
    status: 'draft',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01'),
    _deleted: null
  })
  await mongo.db.collection('numeros').insertOne({_bal: _id, numero: 1})

  const baseLocale = await BaseLocale.update(_id, {
    nom: 'foo2',
    emails: ['me2@domain.co', 'me3@domain.co'],
    status: 'ready-to-publish',
    token: 'hack'
  })

  t.is(baseLocale.nom, 'foo2')
  t.is(baseLocale.token, 'coucou')
  t.deepEqual(baseLocale.emails, ['me2@domain.co', 'me3@domain.co'])
  t.is(baseLocale.status, 'ready-to-publish')
  t.is(Object.keys(baseLocale).length, 9)
})

test('update a BaseLocale / empty base local', async t => {
  const _id = new mongo.ObjectId()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    nom: 'foo',
    commune: '27115',
    emails: ['me@domain.co', 'me2@domain.co'],
    token: 'coucou',
    status: 'draft',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01'),
    _deleted: null
  })

  return t.throwsAsync(() => BaseLocale.update(_id, {
    nom: 'foo2',
    emails: ['me2@domain.co', 'me3@domain.co'],
    status: 'ready-to-publish',
    token: 'hack'
  }), {message: 'La base locale ne possède aucune adresse'})
})

test('update a BaseLocale / not found', t => {
  const _id = new mongo.ObjectId()
  return t.throwsAsync(() => BaseLocale.update(_id, {nom: 'foo'}), {message: 'BaseLocale not found'})
})

test('transform to draft', async t => {
  const _id = new mongo.ObjectId()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    nom: 'Base Adresse Locale [DEMO]',
    commune: '27115',
    token: 'coucou',
    status: 'demo',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01'),
    _deleted: null
  })
  const baseLocaleDemo = await BaseLocale.fetchOne(_id)

  const baseLocale = await BaseLocale.transformToDraft(baseLocaleDemo, {
    nom: 'foo2',
    email: 'me2@domain.co'
  })

  t.is(baseLocale.nom, 'foo2')
  t.deepEqual(baseLocale.emails, ['me2@domain.co'])
  t.is(baseLocale.status, 'draft')
  t.is(Object.keys(baseLocale).length, 9)
})

test('transform to draft / default nom', async t => {
  const _id = new mongo.ObjectId()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    nom: 'Base Adresse Locale [DEMO]',
    commune: '27115',
    token: 'coucou',
    status: 'demo',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01'),
    _deleted: null
  })
  const baseLocaleDemo = await BaseLocale.fetchOne(_id)

  const baseLocale = await BaseLocale.transformToDraft(baseLocaleDemo, {
    email: 'me2@domain.co'
  })

  t.is(baseLocale.nom, 'Adresses de Breux-sur-Avre')
  t.deepEqual(baseLocale.emails, ['me2@domain.co'])
  t.is(baseLocale.status, 'draft')
  t.is(Object.keys(baseLocale).length, 9)
})

test('update a published BaseLocale status', async t => {
  const _id = new mongo.ObjectId()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    nom: 'foo',
    emails: ['me@domain.co', 'me2@domain.co'],
    token: 'coucou',
    status: 'published',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01'),
    _deleted: null
  })

  return t.throwsAsync(() => BaseLocale.update(_id, {status: 'ready-to-publish'}),
    {message: 'La base locale a été publiée, son statut ne peut plus être changé'})
})

test('Delete a demo BaseLocale', async t => {
  const _id = new mongo.ObjectId()
  await mongo.db.collection('bases_locales').insertOne({_id, nom: 'foo', status: 'demo'})
  await mongo.db.collection('voies').insertOne({_bal: _id, nom: 'foo'})
  await mongo.db.collection('numeros').insertOne({_bal: _id, numero: 1})

  await BaseLocale.remove(_id)

  t.falsy(await mongo.db.collection('bases_locales').findOne({_id}))
  t.falsy(await mongo.db.collection('voies').findOne({_bal: _id}))
  t.falsy(await mongo.db.collection('numeros').findOne({_bal: _id}))
})

test('Soft delete a BaseLocale', async t => {
  const _id = new mongo.ObjectId()
  await mongo.db.collection('bases_locales').insertOne({_id, nom: 'foo'})
  await mongo.db.collection('voies').insertOne({_bal: _id, nom: 'foo'})
  await mongo.db.collection('numeros').insertOne({_bal: _id, numero: 1})

  await BaseLocale.remove(_id)

  const baseLocale = await mongo.db.collection('bases_locales').findOne({_id})

  t.truthy(baseLocale._deleted)

  t.deepEqual(baseLocale._deleted, baseLocale._updated)
})

test('Recover BAL', async t => {
  const _id = new mongo.ObjectId()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    nom: 'foo',
    emails: ['me@domain.co', 'me2@domain.co'],
    token: 'coucou',
    status: 'published',
    _created: new Date('2019-01-01'),
    _updated: new Date('2019-01-01'),
    _deleted: new Date('2019-01-01')
  })

  const recoveredBAL = await BaseLocale.recovery(_id)
  const baseLocale = await mongo.db.collection('bases_locales').findOne({_id})

  t.is(recoveredBAL._deleted, null)
  t.is(baseLocale._deleted, null)
  t.deepEqual(recoveredBAL, baseLocale)
})

test('cleanContent', async t => {
  const _id = new mongo.ObjectId()
  await mongo.db.collection('bases_locales').insertOne({_id, nom: 'foo'})
  await mongo.db.collection('voies').insertOne({_bal: _id, nom: 'foo'})
  await mongo.db.collection('numeros').insertOne({_bal: _id, numero: 1})

  await BaseLocale.cleanContent(_id)

  t.truthy(await mongo.db.collection('bases_locales').findOne({_id}))
  t.falsy(await mongo.db.collection('voies').findOne({_bal: _id}))
  t.falsy(await mongo.db.collection('numeros').findOne({_bal: _id}))
})

test('renew token', async t => {
  const _id = new mongo.ObjectId()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    token: 'coucou',
    emails: ['toto@domain.co']
  })

  const baseLocale = await BaseLocale.renewToken(_id)

  t.not(baseLocale.token, 'coucou')
  t.is(baseLocale.token.length, 20)
})

test('clean a commune', async t => {
  const _id = new mongo.ObjectId()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    token: 'coucou',
    commune: '54084'
  })
  await mongo.db.collection('voies').insertOne({_bal: _id, nom: 'foo', commune: '54084'})
  await mongo.db.collection('numeros').insertOne({_bal: _id, numero: 1, commune: '54084'})

  const baseLocale = await BaseLocale.cleanCommune(_id, '54084')

  t.is(baseLocale.commune, '54084')
  t.falsy(await mongo.db.collection('voies').findOne({_bal: _id, commune: '54084'}))
  t.falsy(await mongo.db.collection('numeros').findOne({_bal: _id, commune: '54084'}))
})

test('populate a commune', async t => {
  const _id = new mongo.ObjectId()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    token: 'coucou',
    commune: '54084'
  })
  await mongo.db.collection('voies').insertOne({_bal: _id, nom: 'foo', commune: '54084'})
  await mongo.db.collection('numeros').insertOne({_bal: _id, numero: 1, commune: '54084'})

  mockBan54084()
  const baseLocale = await BaseLocale.populateCommune(_id, '54084')

  t.is(baseLocale.commune, '54084')

  const voie = await mongo.db.collection('voies').findOne({_bal: _id, commune: '54084', nom: 'Allee des Acacias'})
  t.truthy(voie)
  t.is(await mongo.db.collection('numeros').countDocuments({_bal: _id, voie: voie._id, commune: '54084'}), 49)
  t.is(await mongo.db.collection('voies').countDocuments({_bal: _id, commune: '54084'}), 21)
  t.is(await mongo.db.collection('numeros').countDocuments({_bal: _id, commune: '54084'}), 486)
  const distinctVoies = await mongo.db.collection('numeros').distinct('voie', {_bal: _id, commune: '54084'})
  t.is(distinctVoies.length, 21)
})

test('find Bases Locales by codes commune', async t => {
  const _idBalA = new mongo.ObjectId()
  const _idBalB = new mongo.ObjectId()
  const _idBalC = new mongo.ObjectId()

  await mongo.db.collection('bases_locales').insertOne({
    _id: _idBalA,
    token: 'coucou1',
    commune: '47178'
  })

  await mongo.db.collection('bases_locales').insertOne({
    _id: _idBalB,
    token: 'coucou2',
    commune: '47192'
  })

  await mongo.db.collection('bases_locales').insertOne({
    _id: _idBalC,
    token: 'coucou',
    commune: '48678'
  })

  const basesLocales = await BaseLocale.fetchByCommunes(['47192', '47178', '47098'])

  t.deepEqual(basesLocales.map(({_id}) => _id), [_idBalA, _idBalB])
})

test('find Bases Locales by code commune / no BAL found', async t => {
  const _id = new mongo.ObjectId()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    token: 'coucou',
    commune: '54084'
  })

  const basesLocales = await BaseLocale.fetchByCommunes(['77123'])

  t.is(basesLocales.length, 0)
})

test('Fetch Base Locales by commune and email', async t => {
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

  const foundedBasesLocales = await BaseLocale.fetchByQuery({commune: '55326', email: 'living@data.com'})
  const notFoundedBasesLocales = await BaseLocale.fetchByQuery({commune: '55326', email: 'fetching@data.com'})

  t.deepEqual(foundedBasesLocales.basesLocales[0].emails, ['living@data.com'])
  t.is(foundedBasesLocales.basesLocales[0].commune, '55326')
  t.is(notFoundedBasesLocales.basesLocales.length, 0)
})

test('Fetch bases locales by status', async t => {
  const idBal1 = new mongo.ObjectId()
  const idBal2 = new mongo.ObjectId()
  const idBal3 = new mongo.ObjectId()

  await mongo.db.collection('bases_locales').insertOne({
    _id: idBal1,
    token: 'coucou',
    status: 'draft',
    emails: ['living@data.com'],
    commune: '55326'
  })

  await mongo.db.collection('bases_locales').insertOne({
    _id: idBal2,
    token: 'coucou',
    status: 'draft',
    emails: ['fetching@data.com'],
    commune: '55500'
  })

  await mongo.db.collection('bases_locales').insertOne({
    _id: idBal3,
    token: 'coucou',
    status: 'ready-to-publish',
    emails: ['fetching@data.com'],
    commune: '55500'
  })

  const {basesLocales, count} = await BaseLocale.fetchByQuery({status: 'draft'})

  t.is(count, 2)
  t.true(basesLocales.every(({status}) => status === 'draft'))
})

test('Fetch bases locales / cross params', async t => {
  const idBal1 = new mongo.ObjectId()
  const idBal2 = new mongo.ObjectId()
  const idBal3 = new mongo.ObjectId()

  await mongo.db.collection('bases_locales').insertOne({
    _id: idBal1,
    nom: 'bal-A',
    token: 'coucou',
    status: 'draft',
    emails: ['living@data.com'],
    commune: '55326'
  })

  await mongo.db.collection('bases_locales').insertOne({
    _id: idBal2,
    nom: 'bal-A',
    token: 'coucou',
    status: 'draft',
    emails: ['fetching@data.com'],
    commune: '55500'
  })

  await mongo.db.collection('bases_locales').insertOne({
    _id: idBal3,
    nom: 'bal-A',
    token: 'coucou',
    status: 'ready-to-publish',
    emails: ['fetching@data.com'],
    commune: '55500'
  })

  const {basesLocales, count} = await BaseLocale.fetchByQuery({status: 'draft', commune: '55500'})

  t.is(count, 1)
  t.deepEqual(basesLocales[0]._id, idBal2)
})

test('Get all assigned parcelles', async t => {
  const _id = new mongo.ObjectId()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    token: 'coucou',
    commune: '54084'
  })

  await mongo.db.collection('numeros').insertOne({_bal: _id, numero: 1, commune: '54084', parcelles: ['12345000AA0002']})
  await mongo.db.collection('numeros').insertOne({_bal: _id, numero: 2, commune: '54084', parcelles: ['12345000AA0001', '12345000AA0003']})
  await mongo.db.collection('numeros').insertOne({_bal: _id, numero: 3, commune: '54084'})
  await mongo.db.collection('toponymes').insertOne({_bal: _id, commune: '54084'})
  await mongo.db.collection('toponymes').insertOne({_bal: _id, commune: '54084', parcelles: ['12345000AA0003']})
  await mongo.db.collection('toponymes').insertOne({_bal: _id, commune: '54084', parcelles: ['12345000AA0004', '12345000AA0001']})

  const parcelles = await getAssignedParcelles(_id.toString(), '54084')

  t.is(parcelles.length, 4);
  ['12345000AA0001', '12345000AA0002', '12345000AA0003', '12345000AA0004'].forEach(p => {
    t.true(parcelles.includes(p))
  })
})

test('batch baselocale numeros', async t => {
  const idBal = new mongo.ObjectId()
  const idVoieA = new mongo.ObjectId()
  const idVoieB = new mongo.ObjectId()
  const idNumeroA = new mongo.ObjectId()
  const idNumeroB = new mongo.ObjectId()
  const referenceDate = new Date('2021-01-01')

  await mongo.db.collection('bases_locales').insertOne({
    _id: idBal,
    _updated: referenceDate
  })
  await mongo.db.collection('voies').insertOne({
    _id: idVoieA,
    _bal: idBal,
    commune: '12345',
    _updated: referenceDate
  })
  await mongo.db.collection('voies').insertOne({
    _id: idVoieB,
    _bal: idBal,
    commune: '12345',
    _updated: referenceDate
  })
  await mongo.db.collection('numeros').insertOne({
    _id: idNumeroA,
    _bal: idBal,
    commune: '12345',
    voie: idVoieA,
    numero: 21,
    positions: [],
    certifie: false,
    _created: referenceDate,
    _updated: referenceDate
  })
  await mongo.db.collection('numeros').insertOne({
    _id: idNumeroB,
    _bal: idBal,
    commune: '12345',
    voie: idVoieB,
    numero: 42,
    positions: [],
    certifie: true,
    _created: referenceDate,
    _updated: referenceDate
  })

  await BaseLocale.batchUpdateNumeros(idBal, {certifie: true})

  const baseLocale = await mongo.db.collection('bases_locales').find({_id: idBal})
  t.notDeepEqual(baseLocale._updated, referenceDate)

  const voies = await mongo.db.collection('voies').find({_bal: idBal}).toArray()
  t.notDeepEqual(voies[0]._updated, referenceDate)
  t.deepEqual(voies[1]._updated, referenceDate)

  const numeros = await mongo.db.collection('numeros').find({_bal: idBal}).toArray()
  t.is(numeros[0].certifie, true)
  t.is(numeros[1].certifie, true)
  t.notDeepEqual(numeros[0]._updated, referenceDate)
  t.deepEqual(numeros[1]._updated, referenceDate)
})

test('batch baselocale numeros / invalid certifie', async t => {
  const idBal = new mongo.ObjectId()

  const error = await t.throwsAsync(() => BaseLocale.batchUpdateNumeros(idBal, {
    certifie: 'foo'
  }))

  t.deepEqual(error.validation, {
    certifie: ['Le champ certifie doit être de type "boolean"']
  })
})

test('Delete Bases Locales permanently', async t => {
  const now = new Date()
  const idBalA = new mongo.ObjectId()
  const idBalB = new mongo.ObjectId()
  const idBalC = new mongo.ObjectId()
  const idBalD = new mongo.ObjectId()
  const deletedDateA = subMonths(now, 9)
  const deletedDateB = subMonths(now, 13)

  await mongo.db.collection('bases_locales').insertMany([{
    _id: idBalA,
    _updated: deletedDateA,
    _deleted: deletedDateA
  }, {
    _id: idBalB,
    _updated: deletedDateA,
    _deleted: deletedDateA
  }, {
    _id: idBalC,
    _updated: deletedDateB,
    _deleted: deletedDateB
  }, {
    _id: idBalD,
    _updated: deletedDateB,
    _deleted: deletedDateB
  }])

  await BaseLocale.removeSoftDeletedBALsOlderThanOneYear()

  t.truthy(await mongo.db.collection('bases_locales').findOne({_id: idBalA}))
  t.truthy(await mongo.db.collection('bases_locales').findOne({_id: idBalB}))
  t.falsy(await mongo.db.collection('bases_locales').findOne({_id: idBalC}))
  t.falsy(await mongo.db.collection('bases_locales').findOne({_id: idBalD}))
})

test('Delete demo base locales', async t => {
  const now = new Date()
  const idBalA = new mongo.ObjectId()
  const idBalB = new mongo.ObjectId()

  await mongo.db.collection('bases_locales').insertMany([{
    _id: idBalA,
    status: 'demo',
    _updated: now,
    _created: subMonths(now, 2)
  }, {
    _id: idBalB,
    status: 'demo',
    _updated: now,
    _created: now
  }])

  const idVoieA = new mongo.ObjectId()
  await mongo.db.collection('voies').insertOne({_id: idVoieA, _bal: idBalA})

  const idToponymeA = new mongo.ObjectId()
  await mongo.db.collection('toponymes').insertOne({_id: idToponymeA, _bal: idBalA})

  const idNumeroA = new mongo.ObjectId()
  await mongo.db.collection('numeros').insertOne({_id: idNumeroA, _bal: idBalA})

  await BaseLocale.removeDemoBALsOlderThanAMonth()

  const basesLocalesCount = await mongo.db.collection('bases_locales').countDocuments()

  t.is(basesLocalesCount, 1)

  t.truthy(await mongo.db.collection('bases_locales').findOne({_id: idBalB}))

  t.falsy(await mongo.db.collection('bases_locales').findOne({_id: idBalA}))
  t.falsy(await mongo.db.collection('voies').findOne({_id: idVoieA}))
  t.falsy(await mongo.db.collection('toponymes').findOne({_id: idToponymeA}))
  t.falsy(await mongo.db.collection('numeros').findOne({_id: idNumeroA}))
})
