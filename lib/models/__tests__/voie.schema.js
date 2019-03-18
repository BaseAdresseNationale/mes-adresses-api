const test = require('ava')
const Joi = require('joi')
const {createSchema, cleanNom} = require('../voie')

test('valid payload', t => {
  const voie = {nom: 'voie'}

  const {error} = Joi.validate(voie, createSchema)

  t.is(error, null)
})

test('valid payload: with positions', t => {
  const voie = {
    nom: 'voie',
    positions: [
      {
        point: {type: 'Point', coordinates: [1, 1]},
        type: 'entrée',
        source: 'ban'
      }
    ]
  }

  const {error} = Joi.validate(voie, createSchema)

  t.is(error, null)
})

test('not valid payload: nom missing', t => {
  const {error} = Joi.validate({}, createSchema)

  t.true(error.message.includes('"nom" is required'))
})

test('not valid payload: position invalid in positions', t => {
  const voie = {
    nom: 'voie',
    code: 'Z000',
    positions: [{}]
  }

  const {error} = Joi.validate(voie, createSchema)

  t.truthy(error)
})

test('cleanNom', t => {
  t.is(cleanNom(' Allée des   peupliers '), 'Allée des peupliers')
})
