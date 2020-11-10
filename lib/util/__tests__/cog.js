const test = require('ava')
const {getCommunesByDepartement} = require('../cog')

test('getCommunesByDepartement - 54', t => {
  const communes54 = getCommunesByDepartement('54')
  t.true(communes54.length > 0)
  t.is(communes54[0].departement, '54')
})

test('getCommunesByDepartement - A', t => {
  const communesA = getCommunesByDepartement('A')
  t.true(communesA.length === 0)
})
