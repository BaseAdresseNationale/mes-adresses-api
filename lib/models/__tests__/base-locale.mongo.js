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
  await mongo.db.collection('voies').deleteMany({})
  await mongo.db.collection('toponymes').deleteMany({})
  await mongo.db.collection('numeros').deleteMany({})
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

test.serial('create a BaseLocale with CommunesDeleguees', async t => {
  const codeChefLieu = require('@etalab/decoupage-administratif/data/communes.json')
    .find(c => c.chefLieu).chefLieu
  const communesDeleguees = require('@etalab/decoupage-administratif/data/communes.json')
    .filter(c => c.chefLieu === codeChefLieu)
  const baseLocale = await BaseLocale.create({
    nom: 'foo',
    emails: ['me@domain.co'],
    commune: codeChefLieu
  })
  const keys = ['nom', 'status', 'emails', 'commune', 'token', '_updated', '_created', '_id', '_deleted', 'communesDeleguees']

  t.true(keys.every(k => k in baseLocale))
  t.true(baseLocale.status === 'draft')
  t.is(Object.keys(baseLocale).length, 10)
  t.deepEqual(baseLocale.communesDeleguees, communesDeleguees.map(c => c.code))
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

test('Create BAL from merge communes', async t => {
  // Création de la BAL, de ses voies, toponymes et numéros
  const idBal = new mongo.ObjectId()
  const idToponyme = new mongo.ObjectId()
  const idVoieA = new mongo.ObjectId()
  const idVoieB = new mongo.ObjectId()
  const idNumeroA = new mongo.ObjectId()
  const idNumeroB = new mongo.ObjectId()
  const now = new Date()

  await mongo.db.collection('bases_locales').insertOne({
    _id: idBal,
    commune: '27115',
    emails: ['admin_1@mail.fr', 'admin_A@mail.fr'],
    status: 'draft',
    _created: now,
    _updated: now,
    _deleted: null
  })
  await mongo.db.collection('toponymes').insertOne({
    _id: idToponyme,
    _bal: idBal,
    commune: '27115',
    nom: 'Le toponyme'
  })
  await mongo.db.collection('voies').insertOne({
    _id: idVoieA,
    _bal: idBal,
    nom: 'Voie A',
    commune: '27115',
    _created: now,
    _updated: now
  })
  await mongo.db.collection('voies').insertOne({
    _id: idVoieB,
    _bal: idBal,
    commune: '27115',
    nom: 'Voie B',
    nomAlt: {alt: 'Nom voie alt'},
    trace: {type: 'LineString', coordinates: []},
    typeNumerotation: 'metrique',
    _created: now,
    _updated: now
  })
  await mongo.db.collection('numeros').insertOne({
    _id: idNumeroA,
    _bal: idBal,
    commune: '27115',
    voie: idVoieA,
    numero: 21,
    positions: [],
    comment: 'Commentaire du numéro',
    certifie: false,
    _created: now,
    _updated: now
  })
  await mongo.db.collection('numeros').insertOne({
    _id: idNumeroB,
    _bal: idBal,
    commune: '27115',
    voie: idVoieB,
    numero: 42,
    positions: [],
    certifie: true,
    _created: now,
    _updated: now
  })

  // Mock pour le extractBAN
  mockBan54084()

  const newBAL = await BaseLocale.createBaseLocaleFromCommunesMerge({
    codeCommune: '00000',
    nom: 'Base Adresse d’une commune nouvelle',
    communesDeleguees: ['54084'],
    basesLocales: [idBal.toString()],
    emails: ['admin_1@mail.fr', 'admin_B@mail.fr']
  })

  // Makes sure that the BAL produced corresponds to the expectations
  t.is(newBAL.commune, '00000')
  t.is(newBAL.status, 'draft')
  t.is(newBAL.nom, 'Base Adresse d’une commune nouvelle')
  t.deepEqual(newBAL.emails, ['admin_1@mail.fr', 'admin_B@mail.fr', 'admin_A@mail.fr'])

  // Makes sure that the total number of "voies" corresponds (21 for Mont-Bonvillers + 2 for the test BAL).
  const voiesCount = await mongo.db.collection('voies').countDocuments({_bal: mongo.parseObjectID(newBAL._id)})
  t.is(voiesCount, 23)

  // Makes sure that all the fields of the "voie" are kept
  const voieB = await mongo.db.collection('voies').findOne({_bal: mongo.parseObjectID(newBAL._id), commune: '00000', nom: 'Voie B'})
  t.deepEqual(voieB.nomAlt, {alt: 'Nom voie alt'})
  t.deepEqual(voieB.trace, {type: 'LineString', coordinates: []})
  t.is(voieB.typeNumerotation, 'metrique')

  // Makes sure that the "toponyme" is present.
  const toponyme = await mongo.db.collection('toponymes').findOne({_bal: mongo.parseObjectID(newBAL._id), commune: '00000'})
  t.is(toponyme.nom, 'Le toponyme')

  // Makes sure that the number of "numéros" corresponds (486 for Mont-Bonvillers + 2 for the test BAL).
  const numerosCount = await mongo.db.collection('numeros').countDocuments({_bal: mongo.parseObjectID(newBAL._id), commune: '00000'})
  t.is(numerosCount, 488)

  // Makes sure that all the fields of the "numéro" are kept
  const numero = await mongo.db.collection('numeros').findOne({_bal: mongo.parseObjectID(newBAL._id), commune: '00000', numero: 21, comment: 'Commentaire du numéro'})
  t.truthy(numero)

  // Makes sure that the "numéros" have kept their original "voie"
  const voieNumero = await mongo.db.collection('voies').findOne({_id: mongo.parseObjectID(numero.voie)})
  t.is(voieNumero.nom, 'Voie A')

  // Makes sure that the BAL that has been merged has been soft deleted
  const bal = await mongo.db.collection('bases_locales').findOne({_id: idBal})
  t.not(bal._deleted, null)
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

test('Copy Base Locale', async t => {
  const now = new Date()
  const idSourceBAL = new mongo.ObjectId()
  const idDestBAL = new mongo.ObjectId()

  await mongo.db.collection('bases_locales').insertMany([{
    _id: idSourceBAL,
    status: 'draft',
    commune: '27115',
    _updated: now,
    _created: now
  }, {
    _id: idDestBAL,
    status: 'ready-to-publish',
    commune: '54084',
    _updated: now,
    _created: now
  }])

  const idVoie = new mongo.ObjectId()
  await mongo.db.collection('voies').insertOne({
    _id: idVoie,
    _bal: idSourceBAL,
    commune: '27115',
    nom: 'Voie Source',
    nomAlt: {alt: 'Nom voie alt'},
    trace: {type: 'LineString', coordinates: []},
    typeNumerotation: 'metrique',
  })

  const idToponyme = new mongo.ObjectId()
  await mongo.db.collection('toponymes').insertOne({
    _id: idToponyme,
    _bal: idSourceBAL,
    commune: '27115',
    nom: 'Toponyme Source',
    nomAlt: {alt: 'Nom toponyme alt'},
    positions: [{type: 'Point', coordinates: [1, 1]}],
    parcelles: ['42']
  })

  const idNumeroA = new mongo.ObjectId()
  await mongo.db.collection('numeros').insertOne({
    _id: idNumeroA,
    _bal: idSourceBAL,
    voie: idVoie,
    toponyme: idToponyme,
    commune: '27115',
    numero: 1,
    suffixe: 'bis',
    positions: [{type: 'Point', coordinates: [1, 1]}],
    parcelles: ['42'],
    certifie: true
  })

  const idNumeroB = new mongo.ObjectId()
  await mongo.db.collection('numeros').insertOne({
    _id: idNumeroB,
    _bal: idSourceBAL,
    voie: idVoie,
    toponyme: idToponyme,
    commune: '27115',
    numero: 42,
    positions: [{type: 'Point', coordinates: [1, 1]}],
    certifie: false
  })

  await BaseLocale.copyBaseLocale(idSourceBAL, idDestBAL)

  const voiesCount = await mongo.db.collection('voies').countDocuments()
  t.is(voiesCount, 2)

  // Checks if all the fields have been copied and that the code commune is the one of the destination BAL.
  const voie = await mongo.db.collection('voies').findOne({_bal: idDestBAL})
  t.is(voie.nom, 'Voie Source')
  t.is(voie.commune, '54084')
  t.deepEqual(voie.nomAlt, {alt: 'Nom voie alt'})
  t.deepEqual(voie.trace, {type: 'LineString', coordinates: []})
  t.is(voie.typeNumerotation, 'metrique')

  const toponyme = await mongo.db.collection('toponymes').findOne({_bal: idDestBAL})
  t.is(toponyme.nom, 'Toponyme Source')
  t.is(toponyme.commune, '54084')
  t.deepEqual(toponyme.nomAlt, {alt: 'Nom toponyme alt'})
  t.deepEqual(toponyme.positions, [{type: 'Point', coordinates: [1, 1]}])
  t.deepEqual(toponyme.parcelles, ['42'])

  const numeroA = await mongo.db.collection('numeros').findOne({_bal: idDestBAL, numero: 1})
  t.is(numeroA.voie.toString(), voie._id.toString())
  t.is(numeroA.toponyme.toString(), toponyme._id.toString())
  t.is(numeroA.commune, '54084')
  t.deepEqual(numeroA.positions, [{type: 'Point', coordinates: [1, 1]}])
  t.deepEqual(numeroA.parcelles, ['42'])
  t.is(numeroA.certifie, true)

  const numeroB = await mongo.db.collection('numeros').findOne({_bal: idDestBAL, numero: 42})
  t.is(numeroB.voie.toString(), voie._id.toString())
  t.is(numeroB.toponyme.toString(), toponyme._id.toString())
  t.is(numeroB.commune, '54084')
  t.is(numeroB.certifie, false)

  // Checks that the original documents have not been modified
  const baseLocaleSource = await mongo.db.collection('bases_locales').findOne({_id: idSourceBAL})
  t.is(baseLocaleSource.status, 'draft')
  t.is(baseLocaleSource.commune, '27115')

  const voieSource = await mongo.db.collection('voies').findOne({_id: idVoie})
  t.is(voieSource.nom, 'Voie Source')
  t.is(voieSource.commune, '27115')
  t.deepEqual(voieSource.nomAlt, {alt: 'Nom voie alt'})
  t.deepEqual(voieSource.trace, {type: 'LineString', coordinates: []})
  t.is(voieSource.typeNumerotation, 'metrique')

  const toponymeSource = await mongo.db.collection('toponymes').findOne({_id: idToponyme})
  t.is(toponymeSource.nom, 'Toponyme Source')
  t.is(toponymeSource.commune, '27115')
  t.deepEqual(toponymeSource.nomAlt, {alt: 'Nom toponyme alt'})
  t.deepEqual(toponymeSource.positions, [{type: 'Point', coordinates: [1, 1]}])
  t.deepEqual(toponymeSource.parcelles, ['42'])

  const numeroASource = await mongo.db.collection('numeros').findOne({_id: idNumeroA})
  t.is(numeroASource.voie.toString(), idVoie.toString())
  t.is(numeroASource.toponyme.toString(), idToponyme.toString())
  t.is(numeroASource.commune, '27115')
  t.deepEqual(numeroASource.positions, [{type: 'Point', coordinates: [1, 1]}])
  t.deepEqual(numeroASource.parcelles, ['42'])
  t.is(numeroASource.certifie, true)

  const numeroBSource = await mongo.db.collection('numeros').findOne({_id: idNumeroB})
  t.is(numeroBSource.voie.toString(), idVoie.toString())
  t.is(numeroBSource.toponyme.toString(), idToponyme.toString())
  t.is(numeroBSource.commune, '27115')
  t.is(numeroBSource.certifie, false)
})
