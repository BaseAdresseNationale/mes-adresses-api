const express = require('express')
const bodyParser = require('body-parser')
const w = require('../util/w')
const BaseLocale = require('../models/base-locale')
const Voie = require('../models/voie')
const Numero = require('../models/numero')
const Toponyme = require('../models/toponyme')
const errorHandler = require('../util/error-handler')
const sync = require('../sync')
const {createHabilitation, sendPinCode, validatePinCode, fetchHabilitation} = require('../habilitations')
const stats = require('./stats')
const adminRoutes = require('./admin')

const app = new express.Router()

app.use(express.json())

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
  req.isAdmin = checkIsAdmin(baseLocale, req)
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
  req.isAdmin = checkIsAdmin(baseLocale, req)
  next()
}))

app.param('numeroId', w(async (req, res, next) => {
  const id = req.params.numeroId
  const numero = await Numero.fetchOne(id)
  if (!numero) {
    return res.sendStatus(404)
  }

  const baseLocale = await BaseLocale.fetchOne(numero._bal)

  req.numero = numero
  req.isAdmin = checkIsAdmin(baseLocale, req)
  next()
}))

app.param('toponymeId', w(async (req, res, next) => {
  const id = req.params.toponymeId
  const toponyme = await Toponyme.fetchOne(id)
  if (!toponyme) {
    return res.sendStatus(404)
  }

  const baseLocale = await BaseLocale.fetchOne(toponyme._bal)

  req.toponyme = toponyme
  req.isAdmin = checkIsAdmin(baseLocale, req)
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

app.route('/bases-locales/create-demo')
  .post(w(async (req, res) => {
    const baseLocale = await BaseLocale.createDemo(req.body)
    res.status(201).send(baseLocale)
  }))

app.route('/bases-locales/search')
  .get(w(async (req, res) => {
    if (!req.query.codeCommune || !req.query.userEmail) {
      return res.status(400).send({code: 400, message: 'codeCommune et userEmail sont des champs obligatoires'})
    }

    const basesLocales = await BaseLocale.findByCommuneAndEmail(req.query.codeCommune, req.query.userEmail)
    res.send(basesLocales)
  }))

app.route('/bases-locales/:baseLocaleId')
  .get(w(async (req, res) => {
    const {baseLocale} = req
    const {nbNumeros, nbNumerosCertifies} = await BaseLocale.getNumerosCount(baseLocale._id, baseLocale.commune)

    baseLocale.nbNumeros = nbNumeros
    baseLocale.nbNumerosCertifies = nbNumerosCertifies

    if (req.isAdmin) {
      res.send(baseLocale)
    } else {
      res.send(BaseLocale.filterSensitiveFields(baseLocale))
    }
  }))
  .put(ensureIsAdmin, w(async (req, res) => {
    if (req.baseLocale.status === 'demo') {
      return res.status(403).send({code: 403, message: 'Une Base Adresse Locale de démonstration ne peut pas être modifiée. Elle doit d’abord être transformée en brouillon.'})
    }

    const baseLocale = await BaseLocale.update(req.baseLocale._id, req.body)
    res.send(baseLocale)
  }))
  .delete(ensureIsAdmin, w(async (req, res) => {
    await BaseLocale.remove(req.baseLocale._id)
    res.sendStatus(204)
  }))

app.route('/bases-locales/:baseLocaleId/transform-to-draft')
  .post(ensureIsAdmin, w(async (req, res) => {
    if (req.baseLocale.status !== 'demo') {
      return res.status(403).send({
        code: 403,
        message: 'La Base Adresse Locale n’est pas une Base Adresse Locale de démonstration'
      })
    }

    const baseLocale = await BaseLocale.transformToDraft(req.baseLocale, req.body)
    res.send(baseLocale)
  }))

app.route('/bases-locales/:baseLocaleId/sync/exec')
  .post(ensureIsAdmin, w(async (req, res) => {
    const baseLocale = await sync.exec(req.baseLocale._id, {force: true})
    res.send(baseLocale)
  }))

app.route('/bases-locales/:baseLocaleId/sync/pause')
  .post(ensureIsAdmin, w(async (req, res) => {
    const baseLocale = await sync.pause(req.baseLocale._id)
    res.send(baseLocale)
  }))

app.route('/bases-locales/:baseLocaleId/sync/resume')
  .post(ensureIsAdmin, w(async (req, res) => {
    const baseLocale = await sync.resume(req.baseLocale._id)
    res.send(baseLocale)
  }))

app.route('/bases-locales/:baseLocaleId/communes/:codeCommune/upload')
  .post(ensureIsAdmin, bodyParser.raw({limit: '50mb', type: 'text/csv'}), w(async (req, res) => {
    if (!Buffer.isBuffer(req.body)) {
      return res.status(400).send({code: 400, message: 'CSV file required'})
    }

    const result = await BaseLocale.importFile(req.baseLocale._id, req.body, req.params.codeCommune)
    res.send(result)
  }))

app.route('/bases-locales/recovery')
  .post(w(async (req, res) => {
    await BaseLocale.basesLocalesRecovery(req.body.email, req.body.id)
    res.sendStatus(200)
  }))

app.route('/bases-locales/:baseLocaleId/csv')
  .get(w(async (req, res) => {
    const csvFile = await BaseLocale.exportAsCsv(req.baseLocale._id)
    res.attachment('bal.csv').type('csv').send(csvFile)
  }))

app.route('/bases-locales/:baseLocaleId/numeros/batch')
  .post(ensureIsAdmin, w(async (req, res) => {
    const batchUpdate = await Numero.batchUpdateNumeros(req.baseLocale._id, req.body)
    res.send(batchUpdate)
  }))
  .delete(ensureIsAdmin, w(async (req, res) => {
    const batchRemove = await Numero.batchRemoveNumeros(req.baseLocale._id, req.body)
    res.send(batchRemove)
  }))

app.route('/bases-locales/:baseLocaleId/communes/:codeCommune')
  .get(w(async (req, res) => {
    const {codeCommune} = req.params
    if (req.baseLocale.commune !== codeCommune) {
      return res.status(400).send({code: 400, message: 'Cette commune n’a pas encore été ajoutée à la base.'})
    }

    const commune = await BaseLocale.getCommune(req.baseLocale._id, codeCommune)
    res.send(commune)
  }))

function loadHabilitation(allowEmpty = false) {
  return w(async (req, res, next) => {
    if (!req.baseLocale._habilitation) {
      if (allowEmpty) {
        return next()
      }

      return res.status(404).send({code: 404, message: 'Aucune habilitation actuellement rattachée'})
    }

    req.habilitation = await fetchHabilitation(req.baseLocale._habilitation)
    next()
  })
}

function ensurePendingHabilitation(req, res, next) {
  if (req.habilitation.status !== 'pending') {
    return res.status(412).send({code: 412, message: 'Aucune demande d’habilitation en attente'})
  }

  next()
}

app.route('/bases-locales/:baseLocaleId/habilitation')
  .get(ensureIsAdmin, loadHabilitation(), w(async (req, res) => {
    res.send(req.habilitation)
  }))
  .post(ensureIsAdmin, loadHabilitation(true), w(async (req, res) => {
    if (req.habilitation) {
      const now = new Date()
      const {status, expiresAt} = req.habilitation

      if (status === 'accepted' && new Date(expiresAt) > now) {
        return res.status(412).send({code: 412, message: 'Cette Base Adresse Locale possède déjà une habilitation'})
      }
    }

    if (!req.baseLocale.commune) {
      return res.status(412).send({code: 412, message: 'Pour obtenir une habilitation cette BAL doit avoir une commune de rattachement'})
    }

    const habilitation = await createHabilitation(req.baseLocale.commune)
    await BaseLocale.updateHabilitation(req.baseLocale._id, habilitation._id)
    res.send(habilitation)
  }))

app.route('/bases-locales/:baseLocaleId/habilitation/email/send-pin-code')
  .post(ensureIsAdmin, loadHabilitation(), ensurePendingHabilitation, w(async (req, res) => {
    const body = await sendPinCode(req.baseLocale._habilitation)
    return res.status(body.code).send({code: body.code, message: body.message})
  }))

app.route('/bases-locales/:baseLocaleId/habilitation/email/validate-pin-code')
  .post(ensureIsAdmin, loadHabilitation(), ensurePendingHabilitation, w(async (req, res) => {
    if (!req.body.code) {
      return res.status(400).send({code: 400, message: 'code est un champs obligatoire'})
    }

    try {
      const body = await validatePinCode(req.baseLocale._habilitation, req.body.code)

      if (body.validated === false) {
        return res.status(200).send({code: 200, ...body})
      }

      res.send(body)
    } catch (error) {
      return res.status(200).send({code: 200, message: error.message})
    }
  }))

app.route('/bases-locales/:baseLocaleId/communes/:codeCommune/geojson')
  .get(w(async (req, res) => {
    const geojsonStream = await BaseLocale.streamToGeoJSON(req.baseLocale._id, req.params.codeCommune)
    res.type('json')
    geojsonStream.pipe(res)
  }))

app.route('/bases-locales/:baseLocaleId/communes/:codeCommune/populate')
  .post(ensureIsAdmin, w(async (req, res) => {
    const baseLocale = await BaseLocale.populateCommune(req.baseLocale._id, req.params.codeCommune)
    res.send(baseLocale)
  }))

app.post('/bases-locales/:baseLocaleId/token/renew', ensureIsAdmin, w(async (req, res) => {
  const baseLocale = await BaseLocale.renewToken(req.baseLocale._id)
  res.send(baseLocale)
}))

app.route('/bases-locales/:baseLocaleId/communes/:codeCommune/voies')
  .post(ensureIsAdmin, w(async (req, res) => {
    const {codeCommune} = req.params
    if (req.baseLocale.commune !== codeCommune) {
      return res.status(400).send({code: 400, message: 'Cette commune n’a pas encore été ajoutée à la base.'})
    }

    const voie = await Voie.create(req.baseLocale._id, codeCommune, req.body)
    res.status(201).send(voie)
  }))
  .get(w(async (req, res) => {
    const voies = await Voie.fetchAll(req.baseLocale._id, req.params.codeCommune)
    res.send(voies)
  }))

app.route('/bases-locales/:baseLocaleId/communes/:codeCommune/toponymes')
  .post(ensureIsAdmin, w(async (req, res) => {
    const {codeCommune} = req.params
    if (req.baseLocale.commune !== codeCommune) {
      return res.status(400).send({code: 400, message: 'Cette commune n’a pas encore été ajoutée à la base.'})
    }

    const toponyme = await Toponyme.create(req.baseLocale._id, codeCommune, req.body)
    res.status(201).send(toponyme)
  }))
  .get(w(async (req, res) => {
    const toponymes = await Toponyme.fetchAll(req.baseLocale._id, req.params.codeCommune)
    res.send(toponymes)
  }))

app.route('/bases-locales/:baseLocaleId/communes/:codeCommune/parcelles')
  .get(w(async (req, res) => {
    const parcelles = await BaseLocale.getAssignedParcelles(req.params.baseLocaleId, req.params.codeCommune)
    res.send(parcelles)
  }))

app.route('/bases-locales/:baseLocaleId/communes/:codeCommune/batch')
  .post(ensureIsAdmin, w(async (req, res) => {
    const batchUpdate = await BaseLocale.batchUpdateNumeros(req.baseLocale._id, req.params.codeCommune, req.body)
    res.send(batchUpdate)
  }))

app.route('/voies/:voieId')
  .get(w(async (req, res) => {
    const voie = await Voie.getVoie(req.voie._id)
    res.send(voie)
  }))
  .put(ensureIsAdmin, w(async (req, res) => {
    const voie = await Voie.update(req.voie._id, req.body)
    res.send(voie)
  }))
  .delete(ensureIsAdmin, w(async (req, res) => {
    await Voie.remove(req.voie._id)
    res.sendStatus(204)
  }))

app.route('/voies/:voieId/numeros')
  .post(ensureIsAdmin, w(async (req, res) => {
    const numero = await Numero.create(req.voie._id, req.body)
    res.status(201).send(Numero.expandModel(numero))
  }))
  .get(w(async (req, res) => {
    const numeros = await Numero.fetchAll(req.voie._id)

    if (req.isAdmin) {
      res.send(numeros.map(n => Numero.expandModel(n)))
    } else {
      const filtered = numeros.map(n => {
        return Numero.filterSensitiveFields(n)
      })

      res.send(filtered.map(n => Numero.expandModel(n)))
    }
  }))

app.route('/voies/:voieId/batch')
  .post(ensureIsAdmin, w(async (req, res) => {
    const batchUpdate = await Voie.batchUpdateNumeros(req.voie._id, req.body)
    res.send(batchUpdate)
  }))

app.route('/numeros/:numeroId')
  .get(w(async (req, res) => {
    if (req.isAdmin) {
      res.send(Numero.expandModel(req.numero))
    } else {
      const filtered = Numero.filterSensitiveFields(req.numero)

      res.send(Numero.expandModel(filtered))
    }
  }))
  .put(ensureIsAdmin, w(async (req, res) => {
    const numero = await Numero.update(req.numero._id, req.body)
    res.send(Numero.expandModel(numero))
  }))
  .delete(ensureIsAdmin, w(async (req, res) => {
    await Numero.remove(req.numero._id)
    res.sendStatus(204)
  }))

app.route('/toponymes/:toponymeId')
  .get(w(async (req, res) => {
    res.send(req.toponyme)
  }))
  .put(ensureIsAdmin, w(async (req, res) => {
    const toponyme = await Toponyme.update(req.toponyme._id, req.body)
    res.send(toponyme)
  }))
  .delete(ensureIsAdmin, w(async (req, res) => {
    await Toponyme.remove(req.toponyme._id)
    res.sendStatus(204)
  }))

app.route('/toponymes/:toponymeId/numeros')
  .get(w(async (req, res) => {
    const numeros = await Numero.fetchByToponyme(req.toponyme._id)
    if (req.isAdmin) {
      res.send(numeros.map(n => Numero.expandModel(n)))
    } else {
      const filtered = numeros.map(n => {
        return Numero.filterSensitiveFields(n)
      })

      res.send(filtered.map(n => Numero.expandModel(n)))
    }
  }))

app.use('/stats', stats)

/* Admin routes */

if (process.env.ADMIN_TOKEN) {
  app.use(`/admin/${process.env.ADMIN_TOKEN}`, adminRoutes)
}

app.use(errorHandler)

module.exports = app
