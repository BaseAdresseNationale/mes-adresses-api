const express = require('express')
const w = require('../util/w')
const BaseLocale = require('../models/base-locale')
const {getCommunesByDepartement, getDepartement} = require('../util/cog')

const {useCache} = require('../util/cache')

const app = new express.Router()

app.route('/')
  .get(w(async (req, res) => {
    const stats = await useCache('bal-stats', 300, () => BaseLocale.publishedBasesLocalesStats())
    res.send(stats)
  }))

app.route('/couverture-bal')
  .get(w(async (req, res) => {
    const couverture = await useCache('couverture-bal', 300, () => BaseLocale.computeStats())
    res.send(couverture)
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
      basesLocales: basesLocales.map(bal => BaseLocale.filterSensitiveFields(bal)),
      stats
    })
  }))

module.exports = app
