const test = require('ava')
const {checkCadastre} = require('../../cadastre')

test('Commune with cadastre', t => {
  const communeWithCadastre = checkCadastre('38095')

  t.true(communeWithCadastre)
})

test('Commune without cadastre', t => {
  const communeWithoutCadastre = checkCadastre('29084')

  t.false(communeWithoutCadastre)
})
