#!/usr/bin/env node
require('dotenv').config()
const ms = require('ms')
const {detectOutdated, detectConflict, syncOutdated} = require('./lib/sync')
const {removeSoftDeletedBALsOlderThanOneYear, removeDemoBALsOlderThanAMonth} = require('./lib/models/base-locale')
const {TaskQueue} = require('./lib/util/tasks-queue')
const mongo = require('./lib/util/mongo')

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

  // A faire une fois par jour
  // {
  //   name: 'purge old deleted BALs',
  //   every: '1h',
  //   async handler() {
  //     await removeSoftDeletedBALsOlderThanOneYear()
  //   }
  // },
  // {
  //   name: 'purge demo BALs',
  //   every: '24h',
  //   async handler() {
  //     await removeDemoBALsOlderThanAMonth()
  //   }
  // }
]

async function main() {
  await mongo.connect()

  tasks.forEach(task => {
    setInterval(() => {
      queue.pushTask(task)
    }, ms(task.every))
  })
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
