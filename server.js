#!/usr/bin/env node
require('dotenv').config()
const express = require('express')
const morgan = require('morgan')
const cors = require('cors')
const mongo = require('./lib/util/mongo')
const routes = require('./lib/routes')
const {prepareContoursCommunes} = require('./lib/util/contours-communes')

async function main() {
  const app = express()
  const port = process.env.PORT || 5000

  await mongo.connect()
  await prepareContoursCommunes()

  app.use(cors({origin: true}))

  if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev'))
  }

  app.use('/public', express.static('public'))
  app.use('/v1', routes)

  app.listen(port)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
