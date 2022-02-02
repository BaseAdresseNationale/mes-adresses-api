const express = require('express')
const departements = require('@etalab/decoupage-administratif/data/departements.json')
const w = require('../util/w')
const BaseLocale = require('../models/base-locale')
const {getCommunesByDepartement} = require('../util/cog')

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
    const codesCommunes = getCommunesByDepartement(codeDepartement).map(c => c.code)

    if (!departements.some(d => d.code === codeDepartement)) {
      return res.status(404).send({code: 404, message: `Le département ${codeDepartement} n’existe pas.`})
    }

    const basesLocales = await BaseLocale.fetchByCommunes(codesCommunes)
    const stats = await BaseLocale.publishedBasesLocalesStats(codesCommunes)
    const filteredBAL = basesLocales.map(bal => BaseLocale.filterSensitiveFields(bal))

    res.send({
      basesLocales: filteredBAL,
      stats
    })
  }))

module.exports = app
