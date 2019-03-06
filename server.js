#!/usr/bin/env node
const express = require('express')
const morgan = require('morgan')
const cors = require('cors')
const mongo = require('./lib/util/mongo')

async function main() {
  const app = express()
  const port = process.env.PORT || 5000

  await mongo.connect()

  app.use(cors())

  if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev'))
  }

  app.get('/', (req, res) => {
    res.send({message: 'Hello world!'})
  })

  app.listen(port)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
