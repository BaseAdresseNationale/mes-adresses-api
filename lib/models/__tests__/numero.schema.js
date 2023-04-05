const {getLabel} = require('@ban-team/validateur-bal')
const test = require('ava')
const mongo = require('../../util/mongo')
const {validSchema} = require('../../util/payload')
const {createSchema, updateSchema, expandModel, normalizeSuffixe} = require('../numero')

test('valid payload: minimalist', async t => {
  const numero = {
    numero: 42
  }

  const {value, error} = await validSchema(numero, createSchema)

  t.deepEqual(value, numero)
  t.deepEqual(error, {})
})

test('valid payload', async t => {
  const numero = {
    numero: 42,
    suffixe: 'bis',
    positions: [],
    parcelles: [],
    certifie: false
  }

  const {value, error} = await validSchema(numero, createSchema)

  t.deepEqual(value, numero)
  t.deepEqual(error, {})
})

test('valid payload with commune deleguee', async t => {
  const communesDeleguees = require('@etalab/decoupage-administratif/data/communes.json')
  .filter(c => c.chefLieu)
  const numero = {
    numero: 42,
    suffixe: 'bis',
    positions: [],
    parcelles: [],
    certifie: false,
    communeDeleguee: communesDeleguees[0].code
  }

  const {value, error} = await validSchema(numero, createSchema)

  t.deepEqual(value, numero)
  t.deepEqual(error, {})
})

test('valid payload / uppercase suffixe', async t => {
  const numero = {
    numero: 41,
    suffixe: 'BIS'
  }

  const {value, error} = await validSchema(numero, createSchema)

  t.deepEqual(value, numero)
  t.deepEqual(error, {})
})

test('valid payload / certifie true', async t => {
  const numero = {
    numero: 41,
    certifie: true
  }

  const {value, error} = await validSchema(numero, createSchema)

  t.deepEqual(value, numero)
  t.deepEqual(error, {})
})

test('valid payload: with toponyme', async t => {
  const _idToponyme = new mongo.ObjectId()
  const numero = {
    numero: 41,
    toponyme: _idToponyme.toString()
  }

  const {value, error} = await validSchema(numero, createSchema)

  t.deepEqual(value, {
    ...numero,
    toponyme: _idToponyme
  })
  t.deepEqual(error, {})
})

test('not valid payload: numero missing', async t => {
  const {error} = await validSchema({}, createSchema)

  t.deepEqual(error, {numero: ['Le champ numero est obligatoire']})
})

test('not valid payload: numero invalid', async t => {
  const zero = await validSchema({numero: 0}, createSchema)
  const negative = await validSchema({numero: -1}, createSchema)
  const tenTousand = await validSchema({numero: 10000}, createSchema)
  const string = await validSchema({numero: '42'}, createSchema)

  t.deepEqual(zero.error, {})
  t.deepEqual(negative.error, {numero: [getLabel('numero.type_invalide')]})
  t.deepEqual(tenTousand.error, {numero: [getLabel('numero.trop_grand')]})
  t.deepEqual(string.error, {numero: ['Le champ numero doit être de type "number"']})
})

test('not valid payload: invalid fields', async t => {
  const numero = {
    numero: 42,
    toponyme: 'invalid',
    parcelles: ['invalid'],
    certifie: 'invalid'
  }

  const {error} = await validSchema(numero, createSchema)

  t.deepEqual(error, {
    toponyme: ['La valeur du champ toponyme est incorrecte'],
    parcelles: [getLabel('cad_parcelles.valeur_invalide')],
    certifie: ['Le champ certifie doit être de type "boolean"']
  })
})

test('valid payload update', async t => {
  const _idVoie = new mongo.ObjectId()

  const numero = {
    numero: 42,
    voie: _idVoie.toString(),
    suffixe: 'bis',
    comment: 'Hello world',
    positions: [],
    parcelles: []
  }

  const {value, error} = await validSchema(numero, updateSchema)

  t.deepEqual(value, {
    ...numero,
    voie: _idVoie
  })
  t.deepEqual(error, {})
})

test('not valid payload with bad commune deleguee', async t => {
  const communesDeleguees = require('@etalab/decoupage-administratif/data/communes.json')
  .filter(c => c.chefLieu)
  const numero = {
    numero: 42,
    suffixe: 'bis',
    positions: [],
    parcelles: [],
    certifie: false,
    communeDeleguee: "000000"
  }

  const {error} = await validSchema(numero, createSchema)

  t.deepEqual(error, {
    commune: ['Code commune deleguee inconnu'],
  })
})

test('invalid payload update', async t => {
  const numero = {
    numero: 42,
    voie: 'invalid',
    suffixe: 'bis',
    comment: 'Hello world',
    positions: []
  }

  const {error} = await validSchema(numero, updateSchema)

  t.deepEqual(error, {voie: ['La valeur du champ voie est incorrecte']})
})

test('invalid payload update / invalid fields', async t => {
  const _idVoie = new mongo.ObjectId()

  const numero = {
    numero: 42,
    voie: _idVoie.toString(),
    suffixe: 'bis',
    comment: 'Hello world',
    positions: [],
    toponyme: 'invalid',
    parcelles: ['invalid-parcelle']
  }

  const {error} = await validSchema(numero, updateSchema)

  t.deepEqual(error, {
    toponyme: ['La valeur du champ toponyme est incorrecte'],
    parcelles: [getLabel('cad_parcelles.valeur_invalide')]
  })
})

test('expandModel', t => {
  t.is(expandModel({numero: 1, suffixe: null}).numeroComplet, '1')
  t.is(expandModel({numero: 1, suffixe: 'bis'}).numeroComplet, '1bis')
})

test('normalizeSuffixe', t => {
  t.is(normalizeSuffixe('a'), 'a')
  t.is(normalizeSuffixe('A'), 'a')
  t.is(normalizeSuffixe(' A '), 'a')
})
