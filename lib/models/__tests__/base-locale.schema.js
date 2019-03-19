const test = require('ava')
const Joi = require('joi')
const {createSchema} = require('../base-locale')

test('valid payload', t => {
  const baseLocale = {
    nom: 'nom',
    description: 'description',
    emails: ['mail@domain.net']
  }

  const {error} = Joi.validate(baseLocale, createSchema)

  t.is(error, null)
})

test('valid payload: minimalist', t => {
  const baseLocale = {
    emails: ['mail@domain.net']
  }

  const {error} = Joi.validate(baseLocale, createSchema)

  t.is(error, null)
})

test('not valid payload: empty object', t => {
  const {error} = Joi.validate({}, createSchema)
  t.truthy(error)
})

test('not valid payload: nom over 200 caracters', t => {
  const baseLocale = {
    nom: ''.padStart(201, 'a'),
    description: 'description',
    emails: ['mail@domain.net']
  }

  const {error} = Joi.validate(baseLocale, createSchema)

  t.true(error.message.includes('"nom" length must be less than or equal to 200 characters long'))
})

test('not valid payload: description over 2000 caracters', t => {
  const baseLocale = {
    nom: 'nom',
    description: ''.padStart(2001, 'a'),
    emails: ['mail@domain.net']
  }

  const {error} = Joi.validate(baseLocale, createSchema)

  t.true(error.message.includes('"description" length must be less than or equal to 2000 characters long'))
})

test('not valid payload: empty emails array', t => {
  const baseLocale = {
    nom: 'nom',
    description: 'description',
    emails: []
  }

  const {error} = Joi.validate(baseLocale, createSchema)

  t.true(error.message.includes('"emails" must contain at least 1 items'))
})

test('not valid payload: invalid email address', t => {
  const baseLocale = {
    nom: 'nom',
    description: 'description',
    emails: ['invalid-mail']
  }

  const {error} = Joi.validate(baseLocale, createSchema)

  t.true(error.message.includes('must be a valid email'))
})

test('not valid payload: not allowed extra param', t => {
  const baseLocale = {
    nom: 'nom',
    description: 'description',
    emails: ['mail@domain.net'],
    extra: 'extra-param'
  }

  const {error} = Joi.validate(baseLocale, createSchema)

  t.is(error.message, '"extra" is not allowed')
})
