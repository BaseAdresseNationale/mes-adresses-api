const createError = require('http-errors')
const express = require('express')
const {sub, startOfDay, endOfDay} = require('date-fns')
const w = require('../util/w')
const BaseLocale = require('../models/base-locale')
const {getCommunesByDepartement, getDepartement} = require('../util/cog')
const {isValidDate, checkFromIsBeforeTo} = require('../util/date')
const {getBALCreationsPerDay} = require('../services/stats')
const {useCache} = require('../util/cache')

const app = new express.Router()

function checkQueryDateFromTo(req) {
  if ((req.query.from && !req.query.to) || (!req.query.from && req.query.to)) {
    throw createError(400, 'Il manque une date from ou to')
  }

  if (req.query.from && req.query.to) {
    if (!isValidDate(req.query.from) || !isValidDate(req.query.to)) {
      throw createError(400, 'Les dates ne sont pas valides')
    }

    if (!checkFromIsBeforeTo(req.query.from, req.query.to)) {
      throw createError(400, 'La date from est plus vielle que la date to')
    }
  }
}

// OBSOLETTE
app.route('/')
  .get(w(async (req, res) => {
    const stats = await useCache('bal-stats', 300, async () => {
      const publishedBALStats = await BaseLocale.publishedBasesLocalesStats()
      const communesCoveredCount = await BaseLocale.communesCoveredCountStats()
      const statusRepartitionStats = await BaseLocale.statusRepartitionStats()

      return {
        ...publishedBALStats,
        statusRepartitionStats,
        communesCoveredCount
      }
    })
    res.send(stats)
  }))

// DONE
app.route('/bals')
  .post(w(async (req, res) => {
    const {fields} = req.query
    const codesCommunes = req.body
    const bals = await BaseLocale.fetchAllProjectFields(typeof fields === 'string' ? [fields] : fields, codesCommunes)
    res.status(201).send(bals)
  }))

// DONE
app.route('/bals/status')
  .get(w(async (req, res) => {
    const status = await BaseLocale.statusRepartitionStats()
    res.status(201).send(status)
  }))

// DONE
app.route('/creations')
  .get(w(async (req, res) => {
    checkQueryDateFromTo(req)
    const dates = {
      from: req.query.from ? startOfDay(new Date(req.query.from)) : sub(new Date(), {months: 1}),
      to: req.query.to ? endOfDay(new Date(req.query.to)) : new Date()
    }

    const stats = await getBALCreationsPerDay(dates)

    res.send(stats)
  }))

// OBSOLETTE
app.route('/departements/:codeDepartement')
  .get(w(async (req, res) => {
    const {codeDepartement} = req.params
    if (!getDepartement(codeDepartement)) {
      return res.status(404).send({code: 404, message: `Le département ${codeDepartement} n’existe pas.`})
    }

    const codesCommunes = getCommunesByDepartement(codeDepartement).map(c => c.code)

    const stats = await useCache(
      `bal-stats-${codeDepartement}`, 300,
      () => BaseLocale.publishedBasesLocalesStats(codesCommunes)
    )
    const basesLocales = await BaseLocale.fetchByCommunes(codesCommunes)

    res.send({
      basesLocales: basesLocales
        .map(bal => BaseLocale.filterSensitiveFields(bal)),
      stats
    })
  }))

module.exports = app
