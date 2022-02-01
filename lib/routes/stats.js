const express = require('express')
const departements = require('@etalab/decoupage-administratif/data/departements.json')
const w = require('../util/w')
const BaseLocale = require('../models/base-locale')
const {getCommunesByDepartement} = require('../util/cog')

const Cache = require('../util/cache')
const servePbf = require('../util/serve-tiles')

const app = new express.Router()

app.route('/tiles/:z/:x/:y.pbf')
  .get(w(async (req, res) => {
    req.y = Number.parseInt(req.params.y, 10)
    req.x = Number.parseInt(req.params.x, 10)
    req.z = Number.parseInt(req.params.z, 10)

    if (!Cache.has('couverture-bal')) {
      const stats = await BaseLocale.computeStats()
      Cache.set('couverture-bal', stats, 300)
    }

    req.featureCollection = Cache.get('couverture-bal')

    await servePbf(req, res)
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
