const {Router} = require('express')
const w = require('./util/w')
const BaseLocale = require('./models/base-locale')

const app = new Router()

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

module.exports = app
