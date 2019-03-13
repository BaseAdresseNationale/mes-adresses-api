const test = require('ava')
const Joi = require('joi')
const {createSchema} = require('../voie')

test('valid payload', t => {
  const voie = {
    nom: 'voie',
    code: 'Z000'
  }

  const {error} = Joi.validate(voie, createSchema)

  t.is(error, null)
})

test('valid payload: with positions', t => {
  const voie = {
    nom: 'voie',
    code: 'Z000',
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
  const voie = {
    code: 'Z000'
  }

  const {error} = Joi.validate(voie, createSchema)

  t.true(error.message.includes('"nom" is required'))
})

test('not valid payload: code missing', t => {
  const voie = {
    nom: 'voie'
  }

  const {error} = Joi.validate(voie, createSchema)

  t.true(error.message.includes('"code" is required'))
})

test('not valid payload: code invalid', t => {
  const res0 = Joi.validate({nom: 'voie', code: 'AAAA'}, createSchema)
  const res1 = Joi.validate({nom: 'voie', code: 'AA00'}, createSchema)
  const res2 = Joi.validate({nom: 'voie', code: '00AA'}, createSchema)
  const res3 = Joi.validate({nom: 'voie', code: 'A0000'}, createSchema)

  t.true(res0.error.message.includes('"code" with value "AAAA" fails to match the required pattern'))
  t.true(res1.error.message.includes('"code" with value "AA00" fails to match the required pattern'))
  t.true(res2.error.message.includes('"code" with value "00AA" fails to match the required pattern'))
  t.true(res3.error.message.includes('"code" with value "A0000" fails to match the required pattern'))
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
