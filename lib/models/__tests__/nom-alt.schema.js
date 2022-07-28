const {getLabel} = require('@ban-team/validateur-bal')
const test = require('ava')
const {validSchema} = require('../../util/payload')
const {createSchema} = require('../nom-alt')

test('valid payload', async t => {
  const nomAlt = {
    bre: 'Kemper'
  }

  const {value, error} = await validSchema({nomAlt}, {nomAlt: createSchema})

  t.deepEqual(value, {nomAlt})
  t.deepEqual(error, {})
})

test('valid payload: 2 nomAlt', async t => {
  const nomAlt = {
    bre: 'Kemper',
    fra: 'Quimper'
  }

  const {value, error} = await validSchema({nomAlt}, {nomAlt: createSchema})

  t.deepEqual(value, {nomAlt})
  t.deepEqual(error, {})
})

test('not valid payload: disallowed nomAlt', async t => {
  const nomAlt = {
    bra: 'Kemper'
  }

  const {error} = await validSchema({nomAlt}, {nomAlt: createSchema})

  t.deepEqual(error, {nomAlt: ['Le code langue régionale bra n’est pas supporté']})
})

test('not valid payload: empty', async t => {
  const nomAlt = {
    bre: ''
  }

  const {error} = await validSchema({nomAlt}, {nomAlt: createSchema})

  t.deepEqual(error, {nomAlt: [`bre : ${getLabel('voie_nom.valeur_manquante')}`]})
})

test('not valid payload: nomAlt over 200 caracters', async t => {
  const nomAlt = {
    bre: ''.padStart(201, 'a')
  }

  const {error} = await validSchema({nomAlt}, {nomAlt: createSchema})

  t.deepEqual(error, {nomAlt: [`bre : ${getLabel('voie_nom.trop_long')}`]})
})
