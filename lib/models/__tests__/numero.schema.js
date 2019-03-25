const test = require('ava')
const Joi = require('joi')
const {createSchema, expandModel} = require('../numero')

test('valid payload: minimalist', t => {
  const numero = {
    numero: 42
  }

  const {error} = Joi.validate(numero, createSchema)

  t.is(error, null)
})

test('valid payload', t => {
  const numero = {
    numero: 42,
    suffixe: 'bis',
    positions: []
  }

  const {error} = Joi.validate(numero, createSchema)

  t.is(error, null)
})

test('valid payload / minimal', t => {
  const numero = {
    numero: 41,
    suffixe: null
  }

  const {error} = Joi.validate(numero, createSchema)

  t.is(error, null)
})

test('not valid payload: numero missing', t => {
  const {error} = Joi.validate({}, createSchema)

  t.true(error.message.includes('"numero" is required'))
})

test('not valid payload: numero invalid', t => {
  const zero = Joi.validate({numero: 0}, createSchema)
  const negative = Joi.validate({numero: -1}, createSchema)
  const tenTousand = Joi.validate({numero: 10000}, createSchema)
  const string = Joi.validate({numero: '42'}, createSchema)

  t.is(zero.error, null)
  t.true(negative.error.message.includes('must be larger than or equal to 0'))
  t.true(tenTousand.error.message.includes('must be less than or equal to 9999'))
  t.is(string.value.numero, 42)
})

test('expandModel', t => {
  t.is(expandModel({numero: 1, suffixe: null}).numeroComplet, '1')
  t.is(expandModel({numero: 1, suffixe: 'bis'}).numeroComplet, '1bis')
})
