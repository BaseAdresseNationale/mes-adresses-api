
const {promisify} = require('util')
const zlib = require('zlib')
const vtpbf = require('vt-pbf')
const geojsonVt = require('geojson-vt')
const express = require('express')
const {uniq} = require('lodash')
const w = require('../util/w')
const BaseLocale = require('../models/base-locale')
const {getCommunesByDepartement, getDepartement} = require('../util/cog')

const {useCache} = require('../util/cache')

const gzip = promisify(zlib.gzip)

const app = new express.Router()

app.route('/')
  .get(w(async (req, res) => {
    const stats = await useCache('bal-stats', 300, async () => {
      const basesLocalesStats = await BaseLocale.publishedBasesLocalesStats()
      const basesLocalesStatsByStatus = await BaseLocale.getBALStatsByStatus()

      return {
        basesLocalesStats,
        basesLocalesStatsByStatus
      }
    })

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
    const codes = []

    const stats = await useCache(
      `bal-stats-${codeDepartement}`, 300,
      async () => {
        const basesLocalesStats = await BaseLocale.publishedBasesLocalesStats(codesCommunes)
        const basesLocalesStatsByStatus = await BaseLocale.getBALStatsByStatus(codesCommunes)

        return {
          basesLocalesStats,
          basesLocalesStatsByStatus
        }
      }
    )
    const basesLocales = await BaseLocale.fetchByCommunes(codesCommunes)
    const filteredBasesLocales = basesLocales.filter(bal => bal.status !== 'demo')
    const BALGroupedByCommune = BaseLocale.groupBALByCommune(filteredBasesLocales)

    filteredBasesLocales.forEach(bal => {
      bal.communes.forEach(commune => {
        codes.push(commune)
      })
    })

    res.send({
      basesLocales: filteredBasesLocales.map(bal => BaseLocale.filterSensitiveFields(bal)),
      BALGroupedByCommune,
      stats,
      codesCommunes: uniq(codes)
    })
  }))

module.exports = app
