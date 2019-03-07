const test = require('ava')
const Joi = require('joi')
const {createSchema} = require('./position')

test('valid payload', t => {
  const position = {
    point: {type: 'FeatureCollection', features: []},
    source: 'source',
    type: 'entrée'
  }

  const {error} = Joi.validate(position, createSchema)

  t.is(error, null)
})

test('not valid payload: point missing', t => {
  const position = {
    source: 'source',
    type: 'entrée'
  }

  const {error} = Joi.validate(position, createSchema)

  t.true(error.message.includes('"point" is required'))
})

test('not valid payload: point.type missing', t => {
  const position = {
    point: {features: []},
    source: 'source',
    type: 'entrée'
  }

  const {error} = Joi.validate(position, createSchema)

  t.true(error.message.includes('"type" is required'))
})

test('not valid payload: point.type not valid', t => {
  const position = {
    point: {type: 'invalid-type', features: []},
    source: 'source',
    type: 'entrée'
  }

  const {error} = Joi.validate(position, createSchema)

  t.true(error.message.includes('"type" must be one of [FeatureCollection]]'))
})

test('not valid payload: point.features missing', t => {
  const position = {
    point: {type: 'FeatureCollection'},
    source: 'source',
    type: 'entrée'
  }

  const {error} = Joi.validate(position, createSchema)

  t.true(error.message.includes('"features" is required'))
})

test('not valid payload: source missing', t => {
  const position = {
    point: {type: 'FeatureCollection', features: []},
    type: 'entrée'
  }

  const {error} = Joi.validate(position, createSchema)

  t.true(error.message.includes('"source" is required'))
})

test('not valid payload: type missing', t => {
  const position = {
    point: {type: 'FeatureCollection', features: []},
    source: 'source'
  }

  const {error} = Joi.validate(position, createSchema)

  t.true(error.message.includes('"type" is required'))
})

test('not valid payload: type not valid', t => {
  const position = {
    point: {type: 'FeatureCollection', features: []},
    source: 'source',
    type: 'invalid-type'
  }

  const {error} = Joi.validate(position, createSchema)

  t.true(error.message.includes('"type" must be one of'))
})
