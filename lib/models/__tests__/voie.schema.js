const test = require('ava')
const {getLabel} = require('@ban-team/validateur-bal')
const {createSchema, updateSchema} = require('../voie')
const {validSchema} = require('../../util/payload')

test('valid payload', async t => {
  const voie = {nom: 'voie'}

  const {value, error} = await validSchema(voie, createSchema)
  t.deepEqual(value, voie)
  t.deepEqual(error, {})
})

test('valid payload: with trace', async t => {
  const voie = {
    nom: 'voie',
    trace: {
      type: 'LineString',
      coordinates: []
    }
  }

  const {value, error} = await validSchema(voie, createSchema)
  t.deepEqual(value, voie)
  t.deepEqual(error, {})
})

test('not valid payload: nom missing', async t => {
  const {error} = await validSchema({}, createSchema)

  t.deepEqual(error, {
    nom: ['Le champ nom est obligatoire']
  })
})

test('not valid payload: invalid nom', async t => {
  const {error} = await validSchema({nom: 'Fo'}, createSchema)

  t.deepEqual(error, {
    nom: [getLabel('voie_nom.trop_court')]
  })
})

test('not valid payload: invalid typeNumerotation', async t => {
  const voie = {
    nom: 'voie',
    typeNumerotation: 'invalid type'
  }

  const {error} = await validSchema(voie, createSchema)

  t.deepEqual(error, {
    typeNumerotation: [
      'La valeur du champ typeNumerotation est incorrecte, seules "numerique" et "metrique" sont autorisées'
    ]
  })
})

test('not valid payload: invalid trace', async t => {
  const voie = {
    nom: 'voie',
    trace: {
      type: 'line',
      coordinates: {}
    }
  }

  const {error} = await validSchema(voie, createSchema)

  t.deepEqual(error, {
    trace: [
      'Le champ "trace.type" doit avoir pour valeur : "LineString"',
      'Le valeur du champ "type.coordinates" est incorrecte'
    ]
  })
})

test('update valid payload', async t => {
  const voie = {
    nom: 'foo',
    code: '0000',
    typeNumerotation: 'metrique',
  }

  const {value, error} = await validSchema(voie, updateSchema)
  t.deepEqual(value, voie)
  t.deepEqual(error, {})
})

test('update invalid payload', async t => {
  const voie = {
    nom: 'fo',
    code: '42',
    typeNumerotation: null
  }

  const {error} = await validSchema(voie, updateSchema)

  t.deepEqual(error, {
    nom: [getLabel('voie_nom.trop_court')],
    code: ['Le code voie est invalide'],
    typeNumerotation: ['Le champ typeNumerotation ne peut pas être nul']
  })
})

test('update invalid payload null allowed', async t => {
  const voie = {
    code: null,
    trace: null
  }

  const {value, error} = await validSchema(voie, updateSchema)
  t.deepEqual(value, voie)
  t.deepEqual(error, {})
})
