#!/usr/bin/env node
require('dotenv').config()
const ms = require('ms')
const {detectOutdated, detectConflict, syncOutdated} = require('./lib/sync')
const {removeSoftDeletedBALsOlderThanOneYear, removeDemoBALsOlderThanAMonth} = require('./lib/models/base-locale')
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
  },
  {
    name: 'purge old deleted BALs',
    every: '1h',
    async handler() {
      await removeSoftDeletedBALsOlderThanOneYear()
    }
  },
  {
    name: 'purge demo BALs',
    every: '24h',
    async handler() {
      await removeDemoBALsOlderThanAMonth()
    }
  }
]

const queue = []

async function main() {
  await mongo.connect()

  // ADD TASK IN QUEUE AT INTERVALLE
  jobs.forEach(job => {
    setInterval(() => {
      if (queue.some(j => j.name === job.name) === false) {
        queue.push(job)
      }
    }, ms(job.every))
  })

  // LAUNCH TASK IN QUEUE
  let jobIsRunning = false
  setInterval(async () => {
    if (!jobIsRunning) {
      const nextJob = queue.pop()
      if (nextJob) {
        jobIsRunning = true
        const now = new Date()
        console.log(`${now.toISOString().slice(0, 19)} | running job : ${nextJob.name}`)
        await nextJob.handler()
        jobIsRunning = false
      }
    }
  }, ms('5s'))
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
