#!/usr/bin/env node
require('dotenv').config()
const {CronJob} = require('cron')
const ms = require('ms')
const {detectOutdated, detectConflict, syncOutdated} = require('./lib/sync')
const {removeSoftDeletedBALsOlderThanOneYear, removeDemoBALsOlderThanAMonth} = require('./lib/models/base-locale')
const {TaskQueue} = require('./lib/tasks/task-queue')
const mongo = require('./lib/util/mongo')

const jobHandler = async job => {
  console.log(`${new Date().toISOString().slice(0, 19)} | Starting job : ${job.name}`)
  await job.handler()
  console.log(`${new Date().toISOString().slice(0, 19)} | Ending job : ${job.name}`)
}

const queue = new TaskQueue()

const tasks = [
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
]

const cronJobs = [
  {
    // Purge soft deleted BAL for more than one year every day at 3:00 AM
    name: 'purge old deleted BALs',
    schedule: '0 2 * * *',
    async handler() {
      await removeSoftDeletedBALsOlderThanOneYear()
    }
  },
  {
    // Purge old demo BAL every day at 2:00 AM
    name: 'purge demo BALs',
    schedule: '0 3 * * *',
    async handler() {
      await removeDemoBALsOlderThanAMonth()
    }
  }
]

const launchTasks = () => {
  tasks.forEach(task => {
    setInterval(() => {
      queue.pushTask(() => jobHandler(task))
    }, ms(task.every))
  })
}

const launchCronJobs = () => {
  cronJobs.forEach(job => {
    const cronJob = new CronJob(
      job.schedule,
      () => {
        queue.pushTask(() => jobHandler(job))
      },
      false,
      'Europe/Paris'
    )

    cronJob.start()
  })
}

async function main() {
  await mongo.connect()

  launchTasks()
  launchCronJobs()
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})

