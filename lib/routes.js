const {Router} = require('express')
const w = require('./util/w')
const BaseLocale = require('./models/base-locale')
const Voie = require('./models/voie')

const app = new Router()

function ensureIsAdmin(req, res, next) {
  if (!req.isAdmin) {
    return res.sendStatus(403)
  }

  next()
}

function checkIsAdmin(baseLocale, req) {
  return req.get('Authorization') === `Token ${baseLocale.token}`
}

app.param('baseLocaleId', w(async (req, res, next) => {
  const id = req.params.baseLocaleId
  const baseLocale = await BaseLocale.fetchOne(id)
  if (!baseLocale) {
    return res.sendStatus(404)
  }

  req.baseLocale = baseLocale
  checkIsAdmin(baseLocale, req)
  next()
}))

app.param('voieId', w(async (req, res, next) => {
  const id = req.params.voieId
  const voie = await Voie.fetchOne(id)
  if (!voie) {
    return res.sendStatus(404)
  }

  const baseLocale = await BaseLocale.fetchOne(voie._bal)

  req.voie = voie
  checkIsAdmin(baseLocale, req)
  next()
}))

app.route('/bases-locales')
  .get(w(async (req, res) => {
    const basesLocales = await BaseLocale.fetchAll()
    res.send(basesLocales.map(bal => BaseLocale.filterSensitiveFields(bal)))
  }))
  .post(w(async (req, res) => {
    const baseLocale = await BaseLocale.create(req.body)
    res.status(201).send(baseLocale)
  }))

app.route('/bases-locales/:baseLocaleId')
  .get(w(async (req, res) => {
    if (req.isAdmin) {
      res.send(req.baseLocale)
    } else {
      res.send(BaseLocale.filterSensitiveFields(req.baseLocale))
    }
  }))
  .put(ensureIsAdmin, w(async (req, res) => {
    const baseLocale = await BaseLocale.update(req.baseLocale._id, req.body)
    res.send(baseLocale)
  }))
  .delete(ensureIsAdmin, w(async (req, res) => {
    await BaseLocale.remove(req.baseLocale._id)
    res.sendStatus(204)
  }))

app.route('/bases-locales/:baseLocaleId/communes/:codeCommune')
  .put(ensureIsAdmin, w(async (req, res) => {
    const baseLocale = await BaseLocale.addCommune(req.baseLocale._id, req.params.codeCommune)
    res.send(baseLocale)
  }))
  .delete(ensureIsAdmin, w(async (req, res) => {
    const baseLocale = await BaseLocale.removeCommune(req.baseLocale._id, req.params.codeCommune)
    res.send(baseLocale)
  }))

app.post('/bases-locales/:baseLocaleId/token/renew', ensureIsAdmin, w(async (req, res) => {
  const baseLocale = await BaseLocale.renewToken(req.baseLocale._id)
  res.send(baseLocale)
}))

app.route('/bases-locales/:baseLocaleId/communes/:codeCommune/voies')
  .post(ensureIsAdmin, w(async (req, res) => {
    const voie = await Voie.create(req.baseLocale._id, req.params.codeCommune, req.body)
    res.send(voie)
  }))
  .get(w(async (req, res) => {
    const voies = await Voie.fetchAll(req.baseLocale._id, req.params.codeCommune)
    res.send(voies)
  }))

app.route('/voies/:voieId')
  .get(w(async (req, res) => {
    res.send(req.voie)
  }))
  .put(ensureIsAdmin, w(async (req, res) => {
    const voie = await Voie.update(req.voie._id, req.body)
    res.send(voie)
  }))
  .delete(ensureIsAdmin, w(async (req, res) => {
    await Voie.remove(req.voie._id)
    res.sendStatus(204)
  }))

module.exports = app
