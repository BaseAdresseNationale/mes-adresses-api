#!/usr/bin/env node
require('dotenv').config()
const ms = require('ms')
const got = require('got')
const {difference} = require('lodash')
const {detectOutdated} = require('./lib/sync')
const mongo = require('./lib/util/mongo')

async function getPublishedUrls() {
  const response = await got('https://backend.adresse.data.gouv.fr/publication/submissions/published-urls', {responseType: 'json'})
  return response.body
}

const jobs = [
  {
    name: 'sync published status',
    every: '30s',
    async handler() {
      const locallyPublishedResult = await mongo.db.collection('bases_locales').distinct('_id', {status: 'published'})
      const locallyPublished = locallyPublishedResult.map(id => id.toString())

      const publishedUrl = await getPublishedUrls()
      const remotelyPublished = publishedUrl
        .filter(url => url.startsWith('https://api-bal.adresse.data.gouv.fr/v1/bases-locales/'))
        .map(url => url.slice(54, 78))

      const toUpdateToNotPublished = difference(locallyPublished, remotelyPublished)
      const toUpdateToPublished = difference(remotelyPublished, locallyPublished)

      if (toUpdateToNotPublished.length > 0) {
        await mongo.db.collection('bases_locales').updateMany(
          {status: 'published', _id: {$in: toUpdateToNotPublished.map(id => new mongo.ObjectId(id))}},
          {$set: {status: 'ready-to-publish'}}
        )
      }

      if (toUpdateToPublished.length > 0) {
        await mongo.db.collection('bases_locales').updateMany(
          {status: {$ne: 'published'}, _id: {$in: toUpdateToPublished.map(id => new mongo.ObjectId(id))}},
          {$set: {status: 'published'}}
        )
      }
    }
  },
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
