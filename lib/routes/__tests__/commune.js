const test = require('ava')
const express = require('express')
const request = require('supertest')
const routes = require('../')

const KEYS = ['hasCadastre', 'isCOM', 'hasOpenMapTiles', 'hasOrtho', 'hasPlanIGN']

function getApp() {
  const app = express()
  app.use(routes)
  return app
}

test('Call commune route', async t => {
  const {status, body} = await request(getApp())
    .get('/commune/38095')

  t.is(status, 200)
  t.true(typeof body.hasOpenMapTiles === 'boolean')
  t.true(typeof body.hasOrtho === 'boolean')
  t.true(typeof body.hasPlanIGN === 'boolean')
  t.true(KEYS.every(k => k in body))
  t.is(KEYS.length, Object.keys(body).length)
})

test('Not a commune code', async t => {
  const {status, body} = await request(getApp())
    .get('/commune/06660')

  t.is(status, 404)
  t.deepEqual(body, {code: 404, message: 'Commune inconnue'})
})

test('Call commune route / COM with code starting by 975', async t => {
  const {status, body} = await request(getApp())
    .get('/commune/97501')

  t.is(status, 200)
  t.true(typeof body.hasOpenMapTiles === 'boolean')
  t.true(typeof body.hasOrtho === 'boolean')
  t.true(typeof body.hasPlanIGN === 'boolean')
  t.true(KEYS.every(k => k in body))
  t.is(KEYS.length, Object.keys(body).length)
})

test('Call commune route / COM with code starting by 988', async t => {
  const {status, body} = await request(getApp())
    .get('/commune/98801')

  t.is(status, 200)
  t.true(typeof body.hasOpenMapTiles === 'boolean')
  t.true(typeof body.hasOrtho === 'boolean')
  t.true(typeof body.hasPlanIGN === 'boolean')
  t.true(KEYS.every(k => k in body))
  t.is(KEYS.length, Object.keys(body).length)
})
