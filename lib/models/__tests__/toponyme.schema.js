const test = require('ava')
const {createSchema} = require('../toponyme')

test('valid payload', t => {
  const toponyme = {nom: 'toponyme'}

  const {error} = createSchema.validate(toponyme)

  t.is(error, undefined)
})

test('valid payload: with positions', t => {
  const toponyme = {
    nom: 'toponyme',
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
    nom: ''.padStart(201, 'a')
  }

  const {error} = createSchema.validate(toponyme)

  t.true(error.message.includes('"nom" length must be less than or equal to 200 characters long'))
})

test('not valid payload: nom missing', t => {
  const {error} = createSchema.validate({positions: [
    {
      point: {type: 'Point', coordinates: [1, 1]},
      type: 'entrée',
      source: 'ban'
    }
  ]})

  t.true(error.message.includes('"nom" is required'))
})

test('not valid payload: position invalid in positions', t => {
  const toponyme = {
    nom: 'toponyme',
    positions: [{}]
  }

  const {error} = createSchema.validate(toponyme)

  t.truthy(error)
})
