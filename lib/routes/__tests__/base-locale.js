const test = require('ava')
const {omit} = require('lodash')
const {MongoDBServer} = require('mongomem')
const express = require('express')
const request = require('supertest')
const mongo = require('../../util/mongo')
const routes = require('..')

test.before('start server', async () => {
  MongoDBServer.port = 27021 // Temp fix
  await MongoDBServer.start()
  await mongo.connect(await MongoDBServer.getConnectionString())
})

test.after.always('cleanup', async () => {
  await mongo.disconnect()
  await MongoDBServer.tearDown()
})

function getApp() {
  const app = express()
  app.use(routes)
  return app
}

const GENERATED_VARS = ['_id', '_updated', '_created', 'token']
const KEYS = ['nom', 'description', 'emails', 'token', '_updated', '_created', '_id', 'communes']

test.serial('create a BaseLocale', async t => {
  const {body, status} = await request(getApp()).post('/bases-locales').send({
    nom: 'foo',
    description: 'bar',
    emails: ['me@domain.tld']
  })

  t.is(status, 201)
  t.deepEqual(omit(body, GENERATED_VARS), {
    nom: 'foo',
    description: 'bar',
    emails: ['me@domain.tld'],
    communes: []
  })
  t.true(KEYS.every(k => k in body))
  t.is(Object.keys(body).length, KEYS.length)
})
