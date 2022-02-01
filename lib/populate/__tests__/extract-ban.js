const test = require('ava')
const {uniqBy} = require('lodash')
const {extractFromBAN} = require('../extract-ban')
const {mockBan54084} = require('../__mocks__/ban')

test('extract a single commune / 54084', async t => {
  mockBan54084()

  const {voies, numeros} = await extractFromBAN('54084')
  t.is(voies.length, 22)
  t.is(numeros.length, 490)
  t.is(uniqBy(numeros, n => n.voie.toHexString()).length, 22)
})
