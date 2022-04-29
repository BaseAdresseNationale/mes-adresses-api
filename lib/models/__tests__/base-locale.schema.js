const test = require('ava')
const {createSchema, createDemoSchema, updateSchema, transformToDraftSchema} = require('../base-locale')

test('valid payload', t => {
  const baseLocale = {
    nom: 'nom',
    emails: ['mail@domain.net']
  }

  const {error} = createSchema.validate(baseLocale)

  t.is(error, undefined)
})

test('valid payload: minimalist', t => {
  const baseLocale = {
    nom: 'nom',
    emails: ['mail@domain.net']
  }

  const {error} = createSchema.validate(baseLocale)

  t.is(error, undefined)
})

test('not valid payload: no nom', t => {
  const baseLocale = {
    emails: ['mail@domain.net']
  }

  const {error} = createSchema.validate(baseLocale)

  t.true(error.message.includes('"nom" is required'))
})

test('not valid payload: empty object', t => {
  const {error} = createSchema.validate({})
  t.truthy(error)
})

test('not valid payload: nom over 200 caracters', t => {
  const baseLocale = {
    nom: ''.padStart(201, 'a'),
    emails: ['mail@domain.net']
  }

  const {error} = createSchema.validate(baseLocale)

  t.is(error.message, 'Le nom est trop long (200 caractères maximum)')
})

test('not valid payload: empty emails array', t => {
  const baseLocale = {
    nom: 'nom',
    emails: []
  }

  const {error} = createSchema.validate(baseLocale)

  t.true(error.message.includes('"emails" must contain at least 1 items'))
})

test('not valid payload: invalid email address', t => {
  const baseLocale = {
    nom: 'nom',
    emails: ['invalid-mail']
  }

  const {error} = createSchema.validate(baseLocale)

  t.true(error.message.includes('must be a valid email'))
})

test('not valid payload: not allowed extra param', t => {
  const baseLocale = {
    nom: 'nom',
    emails: ['mail@domain.net'],
    extra: 'extra-param'
  }

  const {error} = createSchema.validate(baseLocale)

  t.is(error.message, '"extra" is not allowed')
})

test('not valid payload: invalid status', t => {
  const baseLocale = {
    status: 'invalid-status'
  }

  const {error} = updateSchema.validate(baseLocale)

  t.true(error.message.includes('"status" must be one of [draft, ready-to-publish]'))
})

test('valid demo payload / create', t => {
  const baseLocale = {
    commune: '27115',
    populate: false
  }

  const {error} = createDemoSchema.validate(baseLocale)

  t.is(error, undefined)
})

test('not valid demo payload / no commune', t => {
  const baseLocale = {
    populate: false
  }

  const {error} = createDemoSchema.validate(baseLocale)

  t.is(error.message, 'Code commune inconnu')
})

test('not valid demo payload / invalid commune', t => {
  const baseLocale = {
    commune: '000000',
    populate: false
  }

  const {error} = createDemoSchema.validate(baseLocale)

  t.is(error.message, 'Code commune inconnu')
})

test('not valid demo payload / no populate', t => {
  const baseLocale = {
    commune: '27115'
  }

  const {error} = createDemoSchema.validate(baseLocale)

  t.true(error.message.includes('"populate" is required'))
})

test('valid payload : transform demo to draft', t => {
  const baseLocale = {
    nom: 'foo',
    email: 'mail@test.fr'
  }

  const {error} = transformToDraftSchema.validate(baseLocale)

  t.is(error, undefined)
})

test('invalid payload : no email', t => {
  const baseLocale = {
    nom: 'foo'
  }

  const {error} = transformToDraftSchema.validate(baseLocale)

  t.true(error.message.includes('"email" is required'))
})
