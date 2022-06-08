const test = require('ava')
const {checkIsCOM} = require('../../com')

test('Commune from COM', t => {
  const communeCOM = checkIsCOM('97502')

  t.true(communeCOM)
})

test('Commune not from COM', t => {
  const communeNotFromCOM = checkIsCOM('57463')

  t.false(communeNotFromCOM)
})
