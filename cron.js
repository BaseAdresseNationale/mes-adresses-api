#!/usr/bin/env node
require('dotenv').config()
const ms = require('ms')
const {detectOutdated} = require('./lib/sync')
const mongo = require('./lib/util/mongo')

const jobs = [
  {
    name: 'detect outdated synchronizations',
    every: '30s',
    async handler() {
      await detectOutdated()
    }
  }
]

async function main() {
  await mongo.connect()

  jobs.forEach(job => {
    setInterval(() => job.handler(), ms(job.every))
  })
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
