const express = require('express')
const departements = require('@etalab/decoupage-administratif/data/departements.json')
const w = require('../util/w')
const BaseLocale = require('../models/base-locale')
const {getCommunesByDepartement} = require('../util/cog')

const Cache = require('../util/cache')

const app = new express.Router()

app.route('/couverture-bal')
  .get(w(async (req, res) => {
    if (!Cache.has('couverture-bal')) {
      const stats = await BaseLocale.computeStats()
      Cache.set('couverture-bal', stats, 300)
    }

    res.send(Cache.get('couverture-bal'))
  }))

app.route('/departements/:codeDepartement')
  .get(w(async (req, res) => {
    const {codeDepartement} = req.params
    const codesCommunes = getCommunesByDepartement(codeDepartement).map(c => c.code)

    if (!departements.some(d => d.code === codeDepartement)) {
      return res.status(404).send({code: 404, message: `Le département ${codeDepartement} n’existe pas.`})
    }

    const basesLocales = await BaseLocale.fetchByCommunes(codesCommunes)

    res.send(basesLocales.map(bal => BaseLocale.filterSensitiveFields(bal)))
  }))

module.exports = app
