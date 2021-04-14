const test = require('ava')
const {createSchema, cleanNom} = require('../voie')

test('valid payload', t => {
  const voie = {nom: 'voie'}

  const {error} = createSchema.validate(voie)

  t.is(error, undefined)
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

  const {error} = createSchema.validate(voie)

  t.is(error, undefined)
})

test('valid payload: with trace', t => {
  const voie = {
    nom: 'voie',
    trace: {
      type: 'LineString',
      coordinates: []
    }
  }

  const {error} = createSchema.validate(voie)

  t.is(error, undefined)
})

test('not valid payload: nom missing', t => {
  const {error} = createSchema.validate({})

  t.true(error.message.includes('"nom" is required'))
})

test('not valid payload: position invalid in positions', t => {
  const voie = {
    nom: 'voie',
    code: 'Z000',
    positions: [{}]
  }

  const {error} = createSchema.validate(voie)

  t.truthy(error)
})

test('not valid payload: invalid typeNumerotation', t => {
  const voie = {
    nom: 'voie',
    typeNumerotation: 'invalid type'
  }

  const {error} = createSchema.validate(voie)

  t.truthy(error)
})

test('not valid payload: invalid trace', t => {
  const voie = {
    nom: 'voie',
    trace: {
      type: 'line',
      coordinates: {}
    }
  }

  const {error} = createSchema.validate(voie)

  t.truthy(error)
})

test('cleanNom', t => {
  t.is(cleanNom(' Allée des   peupliers '), 'Allée des peupliers')
})
