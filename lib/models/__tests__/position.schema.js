const {getLabel} = require('@ban-team/validateur-bal')
const test = require('ava')
const {validSchema} = require('../../util/payload')
const {createSchema} = require('../position')

test('valid payload', async t => {
  const position = {
    point: {type: 'Point', coordinates: [1, 1]},
    source: 'source',
    type: 'entrée'
  }

  const {value, error} = await validSchema(position, createSchema)
  t.deepEqual(value, position)
  t.deepEqual(error, {})
})

test('not valid payload: point missing', async t => {
  const position = {
    source: 'source',
    type: 'entrée'
  }

  const {error} = await validSchema(position, createSchema)
  t.deepEqual(error, {point: ['Le champ point est obligatoire']})
})

test('not valid payload: point.type missing', async t => {
  const position = {
    point: {coordinates: [1, 1]},
    source: 'source',
    type: 'entrée'
  }

  const {error} = await validSchema(position, createSchema)

  t.deepEqual(error, {positions: ['Le champ point est invalide']})
})

test('not valid payload: point.type not valid', async t => {
  const position = {
    point: {type: 'invalid-type', coordinates: [1, 1]},
    source: 'source',
    type: 'entrée'
  }

  const {error} = await validSchema(position, createSchema)

  t.deepEqual(error, {point: ['Le champ point.type doit avoir pour valeur "Point"']})
})

test('not valid payload: point.coordinates missing', async t => {
  const position = {
    point: {type: 'Point'},
    source: 'source',
    type: 'entrée'
  }

  const {error} = await validSchema(position, createSchema)

  t.deepEqual(error, {positions: ['Le champ point est invalide']})
})

test('not valid payload: point.coordinates invalid', async t => {
  const position = {
    point: {type: 'Point', coordinates: null},
    source: 'source',
    type: 'entrée'
  }

  position.point.coordinates = []
  const empty = await validSchema(position, createSchema)
  position.point.coordinates = [1, 1, 1]
  const tooMuchItems = await validSchema(position, createSchema)

  t.deepEqual(empty.error, {positions: ['la valeur du champ point.coordinates est incorrecte']})
  t.deepEqual(tooMuchItems.error, {positions: ['la valeur du champ point.coordinates est incorrecte']})
})

test('valid payload: source missing', async t => {
  const position = {
    point: {type: 'Point', coordinates: [1, 1]},
    type: 'entrée'
  }

  const {value, error} = await validSchema(position, createSchema)

  t.deepEqual(value, position)
  t.deepEqual(error, {})
})

test('not valid payload: type missing', async t => {
  const position = {
    point: {type: 'Point', coordinates: [1, 1]},
    source: 'source'
  }

  const {error} = await validSchema(position, createSchema)

  t.deepEqual(error, {type: ['Le champ type est obligatoire']})
})

test('not valid payload: type not valid', async t => {
  const position = {
    point: {type: 'Point', coordinates: [1, 1]},
    source: 'source',
    type: 'invalid-type'
  }

  const {error} = await validSchema(position, createSchema)

  t.deepEqual(error, {positions: [getLabel('position.valeur_invalide')]})
})
