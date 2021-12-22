#!/usr/bin/env node
require('dotenv').config()
const ms = require('ms')
const {detectOutdated, detectConflict, syncOutdated} = require('./lib/sync')
const mongo = require('./lib/util/mongo')

const jobs = [
  {
    name: 'detect outdated sync',
    every: '30s',
    async handler() {
      await detectOutdated()
    }
  },
  {
    name: 'detect sync in conflict',
    every: '30s',
    async handler() {
      await detectConflict()
    }
  },
  {
    name: 'sync outdated',
    every: '5m',
    async handler() {
      await syncOutdated()
    }
  }
]

async function main() {
  await mongo.connect()

  jobs.forEach(job => {
    setInterval(() => {
      const now = new Date()
      console.log(`${now.toISOString()} | running job : ${job.name}`)
      job.handler()
    }, ms(job.every))
  })
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
