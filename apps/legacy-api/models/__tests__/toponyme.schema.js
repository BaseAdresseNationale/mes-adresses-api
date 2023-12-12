const {getLabel} = require('@ban-team/validateur-bal')
const test = require('ava')
const {validSchema} = require('../../util/payload')
const {createSchema} = require('../toponyme')

test('valid payload', async t => {
  const toponyme = {nom: 'toponyme'}

  const {value, error} = await validSchema(toponyme, createSchema)

  t.deepEqual(value, toponyme)
  t.deepEqual(error, {})
})

test('valid payload: with positions', async t => {
  const toponyme = {
    nom: 'toponyme',
    positions: [
      {
        point: {type: 'Point', coordinates: [1, 1]},
        type: 'entrée',
        source: 'ban'
      }
    ],
    parcelles: ['64284000BI0459', '64284000BI0450']
  }

  const {value, error} = await validSchema(toponyme, createSchema)

  t.deepEqual(value, toponyme)
  t.deepEqual(error, {})
})

test('not valid payload: nom over 200 caracters', async t => {
  const toponyme = {
    nom: ''.padStart(201, 'a')
  }

  const {error} = await validSchema(toponyme, createSchema)

  t.deepEqual(error, {nom: ['Le nom du toponyme est trop long (200 caractères maximum)']})
})

test('not valid payload: nom missing', async t => {
  const toponyme = {positions: [
    {
      point: {type: 'Point', coordinates: [1, 1]},
      type: 'entrée',
      source: 'ban'
    }
  ]}
  const {error} = await validSchema(toponyme, createSchema)

  t.deepEqual(error, {nom: ['Le champ nom est obligatoire']})
})

test('not valid payload: position invalid in positions', async t => {
  const toponyme = {
    nom: 'toponyme',
    positions: [{}],
    parcelles: []
  }

  const {error} = await validSchema(toponyme, createSchema)

  t.deepEqual(error, {
    point: ['Le champ point est obligatoire'],
    type: ['Le champ type est obligatoire']
  })
})

test('not valid payload: invalid parcelles', async t => {
  const toponyme = {
    nom: 'toponyme',
    positions: [],
    parcelles: ['PARCELLE123456', 'CC55DATA']
  }

  const {error} = await validSchema(toponyme, createSchema)

  t.deepEqual(error, {parcelles: [getLabel('cad_parcelles.valeur_invalide')]})
})
