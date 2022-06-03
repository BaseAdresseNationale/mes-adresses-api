const test = require('ava')
const express = require('express')
const request = require('supertest')
const routes = require('../')

function getApp() {
  const app = express()
  app.use(routes)
  return app
}

test('Commune with cadastre', async t => {
  const {status, body} = await request(getApp())
    .get('/commune/38095')

  t.is(status, 200)
  t.true(body)
})

test('Commune without cadastre', async t => {
  const {status, body} = await request(getApp())
    .get('/commune/29084')

  t.is(status, 200)
  t.false(body)
})

test('Not a commune code', async t => {
  const {status, body} = await request(getApp())
    .get('/commune/06660')

  t.is(status, 404)
  t.deepEqual(body, {code: 404, message: 'Commune inconnue'})
})
