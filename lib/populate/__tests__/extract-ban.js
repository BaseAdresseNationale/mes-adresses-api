const {join} = require('path')
const test = require('ava')
const nock = require('nock')
const {extract} = require('../extract-ban')

test('extract a single commune / 54084', async t => {
  nock('https://adresse.data.gouv.fr')
    .get('/data/ban-v0/BAN_licence_gratuite_repartage_54.zip')
    .replyWithFile(200, join(__dirname, 'BAN_licence_gratuite_repartage_54.zip'))

  const {voies, numeros} = await extract('54084')
  t.is(voies.length, 20)
  t.is(numeros.length, 445)
})

test('extract a single commune / 54295', async t => {
  nock('https://adresse.data.gouv.fr')
    .get('/data/ban-v0/BAN_licence_gratuite_repartage_54.zip')
    .replyWithFile(200, join(__dirname, 'BAN_licence_gratuite_repartage_54.zip'))

  const {voies, numeros} = await extract('54295')
  t.is(voies.length, 13)
  t.is(numeros.length, 154)
})

test('extract a single commune / not found', async t => {
  nock('https://adresse.data.gouv.fr')
    .get('/data/ban-v0/BAN_licence_gratuite_repartage_54.zip')
    .replyWithFile(200, join(__dirname, 'BAN_licence_gratuite_repartage_54.zip'))

  const {voies, numeros} = await extract('54100')
  t.is(voies.length, 0)
  t.is(numeros.length, 0)
})
