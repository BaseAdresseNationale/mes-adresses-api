const test = require('ava')
const mongo = require('../../util/mongo')
const {createSchema, updateSchema, expandModel, normalizeSuffixe} = require('../numero')

test('valid payload: minimalist', t => {
  const numero = {
    numero: 42
  }

  const {error} = createSchema.validate(numero)

  t.is(error, undefined)
})

test('valid payload', t => {
  const numero = {
    numero: 42,
    suffixe: 'bis',
    positions: []
  }

  const {error} = createSchema.validate(numero)

  t.is(error, undefined)
})

test('valid payload / uppercase suffixe', t => {
  const numero = {
    numero: 41,
    suffixe: 'BIS'
  }

  const {error} = createSchema.validate(numero)

  t.is(error, undefined)
})

test('not valid payload: numero missing', t => {
  const {error} = createSchema.validate({})

  t.true(error.message.includes('"numero" is required'))
})

test('not valid payload: numero invalid', t => {
  const zero = createSchema.validate({numero: 0})
  const negative = createSchema.validate({numero: -1})
  const tenTousand = createSchema.validate({numero: 10000})
  const string = createSchema.validate({numero: '42'})

  t.is(zero.error, undefined)
  t.true(negative.error.message.includes('must be greater than or equal to 0'))
  t.true(tenTousand.error.message.includes('must be less than or equal to 9999'))
  t.is(string.value.numero, 42)
})

test('valid payload update', t => {
  const _idVoie = new mongo.ObjectID()

  const numero = {
    numero: 42,
    voie: _idVoie.toString(),
    suffixe: 'bis',
    comment: 'Hello world',
    positions: []
  }

  const {error} = updateSchema.validate(numero)

  t.is(error, undefined)
})

test('invalid payload update', t => {
  const numero = {
    numero: 42,
    voie: 'invalid',
    suffixe: 'bis',
    comment: 'Hello world',
    positions: []
  }

  const {error} = updateSchema.validate(numero)
  t.true(error.message.includes('"voie" failed custom validation'))
})

test('expandModel', t => {
  t.is(expandModel({numero: 1, suffixe: null}).numeroComplet, '1')
  t.is(expandModel({numero: 1, suffixe: 'bis'}).numeroComplet, '1bis')
})

test('normalizeSuffixe', t => {
  t.is(normalizeSuffixe('a'), 'a')
  t.is(normalizeSuffixe('A'), 'a')
  t.is(normalizeSuffixe(' A '), 'a')
  t.is(normalizeSuffixe(null), null)
})
