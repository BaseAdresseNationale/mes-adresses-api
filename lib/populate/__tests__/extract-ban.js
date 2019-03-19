const test = require('ava')
const {uniqBy} = require('lodash')
const {extract} = require('../extract-ban')
const {mockBan54} = require('../__mocks__/ban')

test('extract a single commune / 54084', async t => {
  mockBan54()

  const {voies, numeros} = await extract('54084')
  t.is(voies.length, 20)
  t.is(numeros.length, 445)
  t.is(uniqBy(numeros, n => n.voie.toHexString()).length, 20)
})

test('extract a single commune / 54295', async t => {
  mockBan54()

  const {voies, numeros} = await extract('54295')
  t.is(voies.length, 13)
  t.is(numeros.length, 154)
  t.is(uniqBy(numeros, n => n.voie.toHexString()).length, 13)
})

test('extract a single commune / not found', async t => {
  mockBan54()

  const {voies, numeros} = await extract('54100')
  t.is(voies.length, 0)
  t.is(numeros.length, 0)
})
