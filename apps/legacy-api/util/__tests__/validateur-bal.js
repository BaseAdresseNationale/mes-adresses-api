const test = require('ava')
const {validateurBAL} = require('../../validateur-bal')

test('validateur BAL valid nom voie', async t => {
  const {value} = await validateurBAL('chemin du moulin', 'voie_nom')
  t.is(value, 'chemin du moulin')
})

test('validateur BAL - autocorrect', async t => {
  const {value} = await validateurBAL('chemin_du_moulin', 'voie_nom')
  t.is(value, 'chemin du moulin')
})
