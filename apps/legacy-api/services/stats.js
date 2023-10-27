const {groupBy, mapValues} = require('lodash')
const {format} = require('date-fns')
const BaseLocale = require('../models/base-locale')

async function getBALCreationsPerDay(dates) {
  const bals = await BaseLocale.getBasesLocalesCreatedBetweenDate(dates)
  const balsGroupByDays = groupBy(bals, bal =>
    format(bal._created, 'yyyy-MM-dd')
  )
  return Object.entries(balsGroupByDays).map(([date, bals]) => {
    const balsGroupedByCommune = groupBy(bals, bal =>
      bal.commune
    )
    return {
      date,
      createdBAL: mapValues(balsGroupedByCommune, balsByCommune => ({
        total: balsByCommune.length,
        published: balsByCommune.filter(({status}) => status === 'published').length,
        draft: balsByCommune.filter(({status}) => status === 'draft').length,
        readyToPublish: balsByCommune.filter(({status}) => status === 'ready-to-publish').length,
        demo: balsByCommune.filter(({status}) => status === 'demo').length,
      }))
    }
  })
}

module.exports = {getBALCreationsPerDay}
