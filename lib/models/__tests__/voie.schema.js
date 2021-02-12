const test = require('ava')
const mongo = require('../../util/mongo')
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

test('valid payload: with complement', t => {
  const voie = {
    nom: 'voie',
    complement: 'complement'
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

test('valid payload: with toponyme', t => {
  const _idToponyme = new mongo.ObjectID()
  const voie = {
    nom: 'voie',
    toponyme: _idToponyme.toString()
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

test('not valid payload: complement over 200 caracters', t => {
  const voie = {
    nom: 'nom',
    code: 'Z000',
    complement: ''.padStart(201, 'a')
  }

  const {error} = createSchema.validate(voie)

  t.true(error.message.includes('"complement" length must be less than or equal to 200 characters long'))
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

test('not valid payload: invalid toponyme', t => {
  const voie = {
    nom: 'voie',
    toponyme: 'invalid'
  }

  const {error} = createSchema.validate(voie)

  t.truthy(error)
})

test('cleanNom', t => {
  t.is(cleanNom(' Allée des   peupliers '), 'Allée des peupliers')
})
