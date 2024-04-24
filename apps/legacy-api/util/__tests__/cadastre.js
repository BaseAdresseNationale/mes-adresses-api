const test = require('ava')
const {checkHasCadastre} = require('../../cadastre')

test('Commune with cadastre', t => {
  const communeWithCadastre = checkHasCadastre('38095')

  t.true(communeWithCadastre)
})

test('Commune without cadastre', t => {
  const communeWithoutCadastre = checkHasCadastre('29084')

  t.false(communeWithoutCadastre)
})
