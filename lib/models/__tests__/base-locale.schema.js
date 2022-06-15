const test = require('ava')
const {validSchema} = require('../../util/payload')
const {createSchema, createDemoSchema, updateSchema, transformToDraftSchema} = require('../base-locale')

test('valid payload', async t => {
  const baseLocale = {
    nom: 'nom',
    emails: ['mail@domain.net'],
    commune: '27115'
  }

  const {value, error} = await validSchema(baseLocale, createSchema)
  t.deepEqual(value, baseLocale)
  t.deepEqual(error, {})
})

test('valid payload: minimalist', async t => {
  const baseLocale = {
    nom: 'nom',
    emails: ['mail@domain.net'],
    commune: '27115'
  }

  const {value, error} = await validSchema(baseLocale, createSchema)
  t.deepEqual(value, baseLocale)
  t.deepEqual(error, {})
})

test('not valid payload: no nom', async t => {
  const baseLocale = {
    emails: ['mail@domain.net'],
    commune: '27115'
  }

  const {error} = await validSchema(baseLocale, createSchema)

  t.deepEqual(error, {
    nom: ['Le champ nom est obligatoire']
  })
})

test('not valid payload: empty object', async t => {
  const {error} = await validSchema({}, createSchema)
  t.deepEqual(error, {
    nom: ['Le champ nom est obligatoire'],
    emails: ['Le champ emails est obligatoire'],
    commune: ['Le champ commune est obligatoire']
  })
})

test('not valid payload: nom over 200 caracters', async t => {
  const baseLocale = {
    nom: ''.padStart(201, 'a'),
    emails: ['mail@domain.net'],
    commune: '27115'
  }

  const {error} = await validSchema(baseLocale, createSchema)

  t.deepEqual(error, {
    nom: ['Le nom est trop long (200 caractères maximum)']
  })
})

test('not valid payload: empty emails array', async t => {
  const baseLocale = {
    nom: 'nom',
    emails: [],
    commune: '27115'
  }

  const {error} = await validSchema(baseLocale, createSchema)

  t.deepEqual(error, {
    emails: ['Le champ emails doit contenir au moins une adresse email']
  })
})

test('not valid payload: invalid email address', async t => {
  const baseLocale = {
    nom: 'nom',
    emails: ['invalid-mail'],
    commune: '27115'
  }

  const {error} = await validSchema(baseLocale, createSchema)

  t.deepEqual(error, {
    emails: ['L’adresse email invalid-mail est invalide']
  })
})

test('not valid payload: not allowed extra param', async t => {
  const baseLocale = {
    nom: 'nom',
    emails: ['mail@domain.net'],
    extra: 'extra-param',
    commune: '27115'
  }

  const {error} = await validSchema(baseLocale, createSchema)

  t.deepEqual(error, {
    extra: ['Le champ extra n’est pas autorisé']
  })
})

test('not valid payload: invalid status', async t => {
  const baseLocale = {
    status: 'invalid-status'
  }

  const {error} = await validSchema(baseLocale, updateSchema)

  t.deepEqual(error, {
    status: ['La valeur du champ status est incorrecte, seules "draft" et "ready-to-publish" sont autorisées']
  })
})

test('valid demo payload / create', async t => {
  const baseLocale = {
    commune: '27115',
    populate: false
  }

  const {value, error} = await validSchema(baseLocale, createDemoSchema)

  t.deepEqual(value, baseLocale)
  t.deepEqual(error, {})
})

test('not valid demo payload / missing required fields', async t => {
  const {error} = await validSchema({}, createDemoSchema)

  t.deepEqual(error, {
    commune: ['Le champ commune est obligatoire'],
    populate: ['Le champ populate est obligatoire']
  })
})

test('not valid demo payload / invalid commune', async t => {
  const baseLocale = {
    commune: '000000',
    populate: false
  }

  const {error} = await validSchema(baseLocale, createDemoSchema)

  t.deepEqual(error, {
    commune: ['Code commune inconnu']
  })
})

test('valid payload : transform demo to draft', async t => {
  const baseLocale = {
    nom: 'foo',
    email: 'mail@test.fr'
  }

  const {value, error} = await validSchema(baseLocale, transformToDraftSchema)

  t.deepEqual(value, baseLocale)
  t.deepEqual(error, {})
})

test('invalid payload : no email', async t => {
  const baseLocale = {
    nom: 'foo'
  }

  const {error} = await validSchema(baseLocale, transformToDraftSchema)

  t.deepEqual(error, {
    email: ['Le champ email est obligatoire']
  })
})
