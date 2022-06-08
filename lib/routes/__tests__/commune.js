const test = require('ava')
const express = require('express')
const request = require('supertest')
const routes = require('../')

function getApp() {
  const app = express()
  app.use(routes)
  return app
}

test('Call commune route', async t => {
  const {status, body} = await request(getApp())
    .get('/commune/38095')

  const KEYS = ['hasCadastre', 'isCOM']

  t.is(status, 200)
  t.true(KEYS.every(k => k in body))
  t.is(KEYS.length, Object.keys(body).length)
})

test('Not a commune code', async t => {
  const {status, body} = await request(getApp())
    .get('/commune/06660')

  t.is(status, 404)
  t.deepEqual(body, {code: 404, message: 'Commune inconnue'})
})
