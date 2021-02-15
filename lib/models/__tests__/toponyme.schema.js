const test = require('ava')
const {createSchema} = require('../toponyme')

test('valid payload', t => {
  const toponyme = {nom: 'toponyme', type: 'lieu-dit'}

  const {error} = createSchema.validate(toponyme)

  t.is(error, undefined)
})

test('valid payload: with positions', t => {
  const toponyme = {
    nom: 'toponyme',
    type: 'lieu-dit',
    positions: [
      {
        point: {type: 'Point', coordinates: [1, 1]},
        type: 'entrée',
        source: 'ban'
      }
    ]
  }

  const {error} = createSchema.validate(toponyme)

  t.is(error, undefined)
})

test('not valid payload: nom over 200 caracters', t => {
  const toponyme = {
    nom: ''.padStart(201, 'a'),
    type: 'lieu-dit'
  }

  const {error} = createSchema.validate(toponyme)

  t.true(error.message.includes('"nom" length must be less than or equal to 200 characters long'))
})

test('not valid payload: nom missing', t => {
  const {error} = createSchema.validate({type: 'lieu-dit'})

  t.true(error.message.includes('"nom" is required'))
})

test('not valid payload: type missing', t => {
  const {error} = createSchema.validate({nom: 'toponyme'})

  t.true(error.message.includes('"type" is required'))
})

test('not valid payload: invalid type', t => {
  const {error} = createSchema.validate({nom: 'toponyme', type: 'invalid'})

  t.truthy(error)
})

test('not valid payload: position invalid in positions', t => {
  const toponyme = {
    nom: 'toponyme',
    type: 'lieu-dit',
    positions: [{}]
  }

  const {error} = createSchema.validate(toponyme)

  t.truthy(error)
})
