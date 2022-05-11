const {getLabel} = require('@etalab/bal')
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
    positions: [],
    parcelles: [],
    certifie: false
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

test('valid payload / certifie true', t => {
  const numero = {
    numero: 41,
    certifie: true
  }

  const {error} = createSchema.validate(numero)

  t.is(error, undefined)
})

test('valid payload: with toponyme', t => {
  const _idToponyme = new mongo.ObjectId()
  const numero = {
    numero: 41,
    toponyme: _idToponyme.toString()
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
  t.is(negative.error.message, getLabel('numero.trop_grand'))
  t.is(tenTousand.error.message, getLabel('numero.trop_grand'))
  t.is(string.value.numero, 42)
})

test('not valid payload: invalid toponyme', t => {
  const numero = {
    numero: 42,
    toponyme: 'invalid'
  }

  const {error} = createSchema.validate(numero)

  t.truthy(error)
})

test('not valid payload: invalid parcelle', t => {
  const numero = {
    numero: 42,
    parcelles: ['invalid']
  }

  const {error} = createSchema.validate(numero)

  t.truthy(error)
})

test('not valid payload: invalid certifie', t => {
  const numero = {
    numero: 42,
    certifie: 'invalid'
  }

  const {error} = createSchema.validate(numero)

  t.truthy(error)
})

test('valid payload update', t => {
  const _idVoie = new mongo.ObjectId()

  const numero = {
    numero: 42,
    voie: _idVoie.toString(),
    suffixe: 'bis',
    comment: 'Hello world',
    positions: [],
    parcelles: []
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

test('invalid payload update / invalid toponyme', t => {
  const _idVoie = new mongo.ObjectId()

  const numero = {
    numero: 42,
    voie: _idVoie.toString(),
    suffixe: 'bis',
    comment: 'Hello world',
    positions: [],
    toponyme: 'invalid'
  }

  const {error} = updateSchema.validate(numero)
  t.truthy(error)
})

test('invalid payload update / invalid parcelles', t => {
  const _idVoie = new mongo.ObjectId()

  const numero = {
    numero: 42,
    voie: _idVoie.toString(),
    suffixe: 'bis',
    comment: 'Hello world',
    positions: [],
    parcelles: ['invalid']
  }

  const {error} = updateSchema.validate(numero)
  t.truthy(error)
})

test('expandModel', t => {
  t.is(expandModel({numero: 1, suffixe: null}).numeroComplet, '1')
  t.is(expandModel({numero: 1, suffixe: 'bis'}).numeroComplet, '1bis')
})

test('normalizeSuffixe', t => {
  t.is(normalizeSuffixe('a'), 'a')
  t.is(normalizeSuffixe('A'), 'a')
  t.is(normalizeSuffixe(' A '), 'a')
})
