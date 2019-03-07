const {Router} = require('express')
const w = require('./util/w')
const BaseLocale = require('./models/base-locale')

const app = new Router()

function ensureIsAdmin(req, res, next) {
  if (!req.isAdmin) {
    return res.sendStatus(403)
  }

  next()
}

app.param('baseLocaleId', w(async (req, res, next) => {
  const id = req.params.baseLocaleId
  const baseLocale = await BaseLocale.fetchOne(id, true)
  if (!baseLocale) {
    return res.sendStatus(404)
  }

  req.baseLocale = baseLocale
  req.isAdmin = req.get('Authorization') === `Token ${baseLocale.token}`
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

app.post('/bases-locales/:baseLocaleId/token/renew', ensureIsAdmin, w(async (req, res) => {
  const baseLocale = await BaseLocale.renewToken(req.baseLocale._id)
  res.send(baseLocale)
}))

module.exports = app
