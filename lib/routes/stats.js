const express = require('express')
const departements = require('@etalab/decoupage-administratif/data/departements.json')
const w = require('../util/w')
const BaseLocale = require('../models/base-locale')
const {getCommunesByDepartement} = require('../util/cog')

const {useCache} = require('../util/cache')
const servePbf = require('../util/serve-tiles')

const app = new express.Router()

app.route('/')
  .get(w(async (req, res) => {
    const stats = await useCache('bal-stats', 300, () => BaseLocale.publishedBasesLocalesStats())
    res.send(stats)
  }))

app.route('/couverture-tiles/:z/:x/:y.pbf')
  .get(w(async (req, res) => {
    req.y = Number.parseInt(req.params.y, 10)
    req.x = Number.parseInt(req.params.x, 10)
    req.z = Number.parseInt(req.params.z, 10)

    req.featureCollection = await useCache('couverture-bal', 300, () => BaseLocale.computeStats())

    await servePbf(req, res)
  }))

app.route('/departements/:codeDepartement')
  .get(w(async (req, res) => {
    const {codeDepartement} = req.params
    if (!departements.some(d => d.code === codeDepartement)) {
      return res.status(404).send({code: 404, message: `Le département ${codeDepartement} n’existe pas.`})
    }

    const codesCommunes = getCommunesByDepartement(codeDepartement).map(c => c.code)

    const stats = await useCache(
      `bal-stats-${codeDepartement}`, 300,
      () => BaseLocale.publishedBasesLocalesStats(codesCommunes)
    )
    const basesLocales = await BaseLocale.fetchByCommunes(codesCommunes)

    res.send({
      basesLocales: basesLocales.map(bal => BaseLocale.filterSensitiveFields(bal)),
      stats
    })
  }))

module.exports = app
