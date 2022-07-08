const test = require('ava')
const {createSchema} = require('../nom-alt')

test('valid payload', t => {
  const nomAlt = {
    bre: 'Kemper'
  }

  const {error} = createSchema.validate(nomAlt)

  t.is(error, undefined)
})

test('valid payload: 2 nomAlt', t => {
  const nomAlt = {
    bre: 'Kemper',
    fra: 'Quimper'
  }

  const {error} = createSchema.validate(nomAlt)

  t.is(error, undefined)
})

test('not valid payload: empty', t => {
  const nomAlt = {
    bre: ''
  }

  const {error} = createSchema.validate(nomAlt)

  t.is(error.message, '"bre" is not allowed to be empty')
})

test('not valid payload: nomAlt over 200 caracters', t => {
  const nomAlt = {
    bre: ''.padStart(201, 'a')
  }

  const {error} = createSchema.validate(nomAlt)

  t.is(error.message, 'Le nom est trop long (200 caractères maximum)')
})
