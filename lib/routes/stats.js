const {promisify} = require('util')
const zlib = require('zlib')
const createError = require('http-errors')
const vtpbf = require('vt-pbf')
const geojsonVt = require('geojson-vt')
const express = require('express')
const {sub, startOfDay, endOfDay} = require('date-fns')
const w = require('../util/w')
const BaseLocale = require('../models/base-locale')
const {getCommunesByDepartement, getDepartement} = require('../util/cog')
const {isValidDate, checkFromIsBeforeTo} = require('../util/date')
const {getBALCreationsPerDay} = require('../services/stats')

const {useCache} = require('../util/cache')

const gzip = promisify(zlib.gzip)

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

app.route('/')
  .get(w(async (req, res) => {
    const stats = await useCache('bal-stats', 300, () => BaseLocale.publishedBasesLocalesStats())
    res.send(stats)
  }))

app.route('/couverture-tiles/:z/:x/:y.pbf')
  .get(w(async (req, res) => {
    const y = Number.parseInt(req.params.y, 10)
    const x = Number.parseInt(req.params.x, 10)
    const z = Number.parseInt(req.params.z, 10)

    if (z > 14) {
      return res.status(204).send()
    }

    const tileIndex = await useCache('couverture-bal-tiles', 300, async () => {
      const featureCollection = await BaseLocale.computeStats()
      return geojsonVt(featureCollection, {indexMaxZoom: 9})
    })

    const tile = tileIndex.getTile(z, x, y)

    if (!tile) {
      return res.status(204).send()
    }

    const pbf = vtpbf.fromGeojsonVt({communes: tile})

    res.set({
      'Content-Type': 'application/x-protobuf',
      'Content-Encoding': 'gzip'
    })

    res.send(await gzip(Buffer.from(pbf)))
  }))

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

module.exports = app
