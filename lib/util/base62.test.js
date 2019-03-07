const test = require('ava')
const {base62IntToChar, base62IntToString, generateBase62Part, generateBase62String} = require('./base62')

test('base62IntToChar', t => {
  t.is(base62IntToChar(0), '0')
  t.is(base62IntToChar(10), 'a')
  t.is(base62IntToChar(36), 'A')
  t.is(base62IntToChar(36), 'A')
  t.throws(() => base62IntToChar(-1))
  t.throws(() => base62IntToChar(62))
  t.throws(() => base62IntToChar('oo'))
})

test('base62IntToString', t => {
  t.is(base62IntToString(0), '0')
  t.is(base62IntToString(62), '10')
  t.throws(() => base62IntToString(-1))
  t.throws(() => base62IntToString(Number.MAX_SAFE_INTEGER + 1))
  t.throws(() => base62IntToString('oo'))
})

test('generateBase62Part', t => {
  t.is(generateBase62Part().length, 10)
})

test('generateBase62String', t => {
  t.is(generateBase62String(25).length, 25)
})
