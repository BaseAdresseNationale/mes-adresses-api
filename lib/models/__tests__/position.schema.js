const test = require('ava')
const Joi = require('joi')
const {createSchema} = require('../position')

test('valid payload', t => {
  const position = {
    point: {type: 'Point', coordinates: [1, 1]},
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
    point: {coordinates: [1, 1]},
    source: 'source',
    type: 'entrée'
  }

  const {error} = Joi.validate(position, createSchema)

  t.true(error.message.includes('"type" is required'))
})

test('not valid payload: point.type not valid', t => {
  const position = {
    point: {type: 'invalid-type', coordinates: [1, 1]},
    source: 'source',
    type: 'entrée'
  }

  const {error} = Joi.validate(position, createSchema)

  t.true(error.message.includes('"type" must be one of [Point]]'))
})

test('not valid payload: point.coordinates missing', t => {
  const position = {
    point: {type: 'Point'},
    source: 'source',
    type: 'entrée'
  }

  const {error} = Joi.validate(position, createSchema)

  t.true(error.message.includes('"coordinates" is required'))
})

test('not valid payload: point.coordinates invalid', t => {
  const position = {
    point: {type: 'Point', coordinates: null},
    source: 'source',
    type: 'entrée'
  }

  position.point.coordinates = []
  const empty = Joi.validate(position, createSchema)
  position.point.coordinates = [1, 1, 1]
  const tooMuchItems = Joi.validate(position, createSchema)

  t.true(empty.error.message.includes('"coordinates" must contain at least 2 items'))
  t.true(tooMuchItems.error.message.includes(''))
})

test('not valid payload: source missing', t => {
  const position = {
    point: {type: 'Point', coordinates: [1, 1]},
    type: 'entrée'
  }

  const {error} = Joi.validate(position, createSchema)

  t.true(error.message.includes('"source" is required'))
})

test('not valid payload: type missing', t => {
  const position = {
    point: {type: 'Point', coordinates: [1, 1]},
    source: 'source'
  }

  const {error} = Joi.validate(position, createSchema)

  t.true(error.message.includes('"type" is required'))
})

test('not valid payload: type not valid', t => {
  const position = {
    point: {type: 'Point', coordinates: [1, 1]},
    source: 'source',
    type: 'invalid-type'
  }

  const {error} = Joi.validate(position, createSchema)

  t.true(error.message.includes('"type" must be one of'))
})
