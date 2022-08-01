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

test('not valid payload: too many nomAlt', t => {
  const nomAlt = {
    bre: 'nomAlt bre',
    fra: 'nomAlt fra',
    eus: 'nomAlt eus',
    gsw: 'nomAlt gsw',
    gcf: 'nomAlt gcf',
    cos: 'nomAlt cos',
    gyn: 'nomAlt gyn',
    rcf: 'nomAlt rcf',
    oci: 'nomAlt oci',
    guy: 'nomAlt guy',
    gla: 'nomAlt gla',
    cat: 'nomAlt cat'
  }

  const {error} = createSchema.validate(nomAlt)

  t.is(error.message, '"value" failed custom validation because Trop de nom (10 maximum)')
})

test('not valid payload: disallowed nomAlt', t => {
  const nomAlt = {
    bra: 'Kemper'
  }

  const {error} = createSchema.validate(nomAlt)

  t.is(error.message, '"value" failed custom validation because Valeurs "nomAlt" inattendues : bra. Valeurs attendues : fra, bre, eus, gsw, cos, gcr, gcf, rcf, swb,cat ou oci')
})

test('not valid payload: empty', t => {
  const nomAlt = {
    bre: ''
  }

  const {error} = createSchema.validate(nomAlt)

  t.is(error.message, '"value" failed custom validation because Ce champ ne peut être vide')
})

test('not valid payload: nomAlt over 200 caracters', t => {
  const nomAlt = {
    bre: ''.padStart(201, 'a')
  }

  const {error} = createSchema.validate(nomAlt)

  t.is(error.message, '"value" failed custom validation because Le nom est trop long (200 caractères maximum)')
})
