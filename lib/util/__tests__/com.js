const test = require('ava')
const {isCOM} = require('../../com')

test('Commune from COM', t => {
  const communeCOM = isCOM('97502')

  t.true(communeCOM)
})

test('Commune not from COM', t => {
  const communeNotFromCOM = isCOM('57463')

  t.false(communeNotFromCOM)
})
