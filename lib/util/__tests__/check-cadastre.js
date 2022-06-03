const test = require('ava')
const {checkCadastre} = require('../../check-cadastre')

test('Commune with cadastre', t => {
  const communeWithCadastre = checkCadastre('38095')
  const communeWithoutCadastre = checkCadastre('29084')

  t.true(communeWithCadastre)
  t.false(communeWithoutCadastre)
})
