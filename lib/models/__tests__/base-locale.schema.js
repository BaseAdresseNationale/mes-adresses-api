const test = require('ava')
const {createSchema, updateSchema} = require('../base-locale')

test('valid payload', t => {
  const baseLocale = {
    nom: 'nom',
    emails: ['mail@domain.net'],
    enableComplement: false
  }

  const {error} = createSchema.validate(baseLocale)

  t.is(error, undefined)
})

test('valid payload: minimalist', t => {
  const baseLocale = {
    emails: ['mail@domain.net']
  }

  const {error} = createSchema.validate(baseLocale)

  t.is(error, undefined)
})

test('valid payload: change enableComplement to true', t => {
  const baseLocale = {
    enableComplement: true
  }

  const {error} = updateSchema.validate(baseLocale)

  t.is(error, undefined)
})

test('not valid payload: empty object', t => {
  const {error} = createSchema.validate({})
  t.truthy(error)
})

test('not valid payload: nom over 200 caracters', t => {
  const baseLocale = {
    nom: ''.padStart(201, 'a'),
    emails: ['mail@domain.net'],
    enableComplement: false
  }

  const {error} = createSchema.validate(baseLocale)

  t.true(error.message.includes('"nom" length must be less than or equal to 200 characters long'))
})

test('not valid payload: empty emails array', t => {
  const baseLocale = {
    nom: 'nom',
    emails: [],
    enableComplement: false
  }

  const {error} = createSchema.validate(baseLocale)

  t.true(error.message.includes('"emails" must contain at least 1 items'))
})

test('not valid payload: invalid email address', t => {
  const baseLocale = {
    nom: 'nom',
    emails: ['invalid-mail'],
    enableComplement: false
  }

  const {error} = createSchema.validate(baseLocale)

  t.true(error.message.includes('must be a valid email'))
})

test('not valid payload: not allowed extra param', t => {
  const baseLocale = {
    nom: 'nom',
    emails: ['mail@domain.net'],
    enableComplement: false,
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
