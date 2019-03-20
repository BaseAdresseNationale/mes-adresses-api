const test = require('ava')
const express = require('express')
const request = require('supertest')
const w = require('../w')

test('w with a simple 200 response', async t => {
  const app = express()
  app.get('/', w(async (req, res) => res.sendStatus(200)))
  const response = await request(app).get('/')
  t.is(response.status, 200)
})

test('w with an error thown', async t => {
  const app = express()
  app.get('/', w(async () => {
    throw new Error('Oops')
  }))
  const response = await request(app).get('/')
  t.is(response.status, 500)
})

