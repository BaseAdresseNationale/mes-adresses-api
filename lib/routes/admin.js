const express = require('express')
const csvWriter = require('csv-write-stream')
const getStream = require('get-stream')
const intoStream = require('into-stream')
const pumpify = require('pumpify')

const mongo = require('../util/mongo')
const w = require('../util/w')

const app = new express.Router()

app.get('/emails.csv', w(async (req, res) => {
  const emails = await mongo.db.collection('bases_locales')
    .distinct('emails')

  const csvContent = await getStream(pumpify.obj(
    intoStream.object(emails.filter(e => e).map(email => ({email}))),
    csvWriter()
  ))

  res.set('Content-Type', 'text/csv').send(csvContent)
}))

module.exports = app
