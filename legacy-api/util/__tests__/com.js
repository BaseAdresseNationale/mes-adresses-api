const test = require('ava')
const {checkIsCOM, checkHasMapsStyles} = require('../../com')

test('Commune from COM', t => {
  const communeCOM = checkIsCOM('97502')

  t.true(communeCOM)
})

test('Commune not from COM', t => {
  const communeNotFromCOM = checkIsCOM('57463')

  t.false(communeNotFromCOM)
})

test('Check commune maps styles / commune not from COM', t => {
  const isCOM = checkIsCOM('57463')
  const communeNotFromCOM = checkHasMapsStyles('57463', isCOM)

  t.is(communeNotFromCOM.hasOpenMapTiles, true)
  t.is(communeNotFromCOM.hasOrtho, true)
  t.is(communeNotFromCOM.hasPlanIGN, true)
})

test('Check commune maps styles / COM with code starting by 975', t => {
  const isCOM = checkIsCOM('97502')
  const communeFromCOM = checkHasMapsStyles('97502', isCOM)

  t.is(communeFromCOM.hasOpenMapTiles, true)
  t.is(communeFromCOM.hasOrtho, true)
  t.is(communeFromCOM.hasPlanIGN, false)
})

test('Check commune maps styles / COM with code starting by 977', t => {
  const isCOM = checkIsCOM('97701')
  const communeFromCOM = checkHasMapsStyles('97701', isCOM)

  t.is(communeFromCOM.hasOpenMapTiles, true)
  t.is(communeFromCOM.hasOrtho, true)
  t.is(communeFromCOM.hasPlanIGN, true)
})

test('Check commune maps styles / COM with code starting by 978', t => {
  const isCOM = checkIsCOM('97802')
  const communeFromCOM = checkHasMapsStyles('97802', isCOM)

  t.is(communeFromCOM.hasOpenMapTiles, true)
  t.is(communeFromCOM.hasOrtho, true)
  t.is(communeFromCOM.hasPlanIGN, true)
})

test('Check commune maps styles / COM with code starting by 986', t => {
  const isCOM = checkIsCOM('98601')
  const communeFromCOM = checkHasMapsStyles('98601', isCOM)

  t.is(communeFromCOM.hasOpenMapTiles, true)
  t.is(communeFromCOM.hasOrtho, true)
  t.is(communeFromCOM.hasPlanIGN, false)
})

test('Check commune maps styles / COM with code starting by 987', t => {
  const isCOM = checkIsCOM('98702')
  const communeFromCOM = checkHasMapsStyles('98702', isCOM)

  t.is(communeFromCOM.hasOpenMapTiles, true)
  t.is(communeFromCOM.hasOrtho, false)
  t.is(communeFromCOM.hasPlanIGN, false)
})

test('Check commune maps styles / COM with code starting by 988', t => {
  const isCOM = checkIsCOM('98801')
  const communeFromCOM = checkHasMapsStyles('98801', isCOM)

  t.is(communeFromCOM.hasOpenMapTiles, true)
  t.is(communeFromCOM.hasOrtho, false)
  t.is(communeFromCOM.hasPlanIGN, false)
})
