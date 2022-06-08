const test = require('ava')
const {checkCOM} = require('../../com')

test('Commune from COM', t => {
  const communeCOM = checkCOM('97502')

  t.true(communeCOM)
})

test('Commune not from COM', t => {
  const communeNotFromCOM = checkCOM('57463')

  t.false(communeNotFromCOM)
})
