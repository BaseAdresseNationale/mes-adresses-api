const zlib = require('zlib')
const {promisify} = require('util')
const express = require('express')
const bodyParser = require('body-parser')
const createError = require('http-errors')
const vtpbf = require('vt-pbf')
const w = require('../util/w')
const BaseLocale = require('../models/base-locale')
const Voie = require('../models/voie')
const Numero = require('../models/numero')
const Toponyme = require('../models/toponyme')
const errorHandler = require('../util/error-handler')
const {getCommune} = require('../util/cog')
const {expandBalWithNumeros, expandVoiesOrToponymes, expandVoieOrToponyme} = require('../util/models')
const {getEditorUrl} = require('../emails/util')
const sync = require('../sync')
const {createHabilitation, sendPinCode, validatePinCode, fetchHabilitation} = require('../habilitations')
const {checkHasCadastre} = require('../cadastre')
const {checkIsCOM, checkHasMapsStyles} = require('../com')
const stats = require('./stats')
const adminRoutes = require('./admin')

const app = new express.Router()

const gzip = promisify(zlib.gzip)

app.use(express.json())

function ensureIsAdmin(req, res, next) {
  if (!req.isAdmin) {
    const message = 'Permission denied'
    return res.status(403).json({message})
  }

  next()
}

function checkIsAdmin(baseLocale, req) {
  return req.get('Authorization') === `Token ${baseLocale.token}`
    || req.get('Authorization') === `Token ${process.env.ADMIN_TOKEN}`
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

// DONE
app.route('/bases-locales')
  .post(w(async (req, res) => {
    const baseLocale = await BaseLocale.create(req.body)
    const baseLocaleExpanded = await expandBalWithNumeros(baseLocale)
    res.status(201).send(baseLocaleExpanded)
  }))

// DONE
app.route('/bases-locales/create-demo')
  .post(w(async (req, res) => {
    const baseLocale = await BaseLocale.createDemo(req.body)
    res.status(201).send(baseLocale)
  }))

// DONE
app.route('/bases-locales/search')
  .get(w(async (req, res) => {
    const {offset, limit, count, basesLocales} = await BaseLocale.fetchByQuery(req.query)
    const basesLocalesExpanded = await Promise.all(
      basesLocales.map(baseLocale => expandBalWithNumeros(baseLocale))
    )

    res.send({
      offset,
      limit,
      count,
      results: basesLocalesExpanded.map(bal => BaseLocale.filterSensitiveFields(bal))
    })
  }))

// DONE
app.route('/bases-locales/:baseLocaleId')
  .get(w(async (req, res) => {
    const baseLocale = await expandBalWithNumeros(req.baseLocale)

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

// DONE
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

// DONE
app.route('/bases-locales/:baseLocaleId/sync/exec')
  .post(ensureIsAdmin, w(async (req, res) => {
    const baseLocale = await sync.exec(req.baseLocale._id, {force: true})
    res.send(baseLocale)
  }))

// DONE
app.route('/bases-locales/:baseLocaleId/sync/pause')
  .post(ensureIsAdmin, w(async (req, res) => {
    const baseLocale = await sync.pause(req.baseLocale._id)
    res.send(baseLocale)
  }))

// DONE
app.route('/bases-locales/:baseLocaleId/sync/resume')
  .post(ensureIsAdmin, w(async (req, res) => {
    const baseLocale = await sync.resume(req.baseLocale._id)
    res.send(baseLocale)
  }))

// DONE
app.route('/bases-locales/:baseLocaleId/upload')
  .post(ensureIsAdmin, bodyParser.raw({limit: '50mb', type: 'text/csv'}), w(async (req, res) => {
    if (!Buffer.isBuffer(req.body)) {
      return res.status(400).send({code: 400, message: 'CSV file required'})
    }

    const result = await BaseLocale.importFile(req.baseLocale, req.body)
    res.send(result)
  }))

// DONE
app.route('/bases-locales/recovery')
  .post(w(async (req, res) => {
    await BaseLocale.basesLocalesRecovery(req.body.email, req.body.id)
    res.sendStatus(200)
  }))

// DONE
app.route('/bases-locales/:baseLocaleId/csv')
  .get(w(async (req, res) => {
    const csvFile = await BaseLocale.exportAsCsv(req.baseLocale._id)
    res.attachment('bal.csv').type('csv').send(csvFile)
  }))

// DONE
app.route('/bases-locales/:baseLocaleId/voies/csv')
  .get(w(async (req, res) => {
    const csvFile = await BaseLocale.exportVoiesAsCsv(req.baseLocale._id)
    res.status(200).attachment('liste-des-voies.csv').type('csv').send(csvFile)
  }))

// DONE
app.route('/bases-locales/:baseLocaleId/numeros/batch')
  .post(ensureIsAdmin, w(async (req, res) => {
    const batchUpdate = await Numero.batchUpdateNumeros(req.baseLocale._id, req.body)
    res.send(batchUpdate)
  }))
  .delete(ensureIsAdmin, w(async (req, res) => {
    const batchRemove = await Numero.batchRemoveNumeros(req.baseLocale._id, req.body)
    res.send(batchRemove)
  }))

// DONE
app.route('/bases-locales/:baseLocaleId/numeros/batch/soft-delete')
  .put(ensureIsAdmin, w(async (req, res) => {
    const batchSoftRemove = await Numero.batchSoftRemoveNumeros(req.baseLocale._id, req.body)
    res.send(batchSoftRemove)
  }))

// DONE
app.route('/bases-locales/:baseLocaleId/:token/recovery')
  .get(w(async (req, res) => {
    if (req.baseLocale.token !== req.params.token) {
      return res.sendStatus(403)
    }

    const restoredBaseLocale = await BaseLocale.recovery(req.baseLocale._id)
    const editorUrl = getEditorUrl(restoredBaseLocale)

    res.redirect(editorUrl)
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

// DONE
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

    const habilitation = await createHabilitation(req.baseLocale.commune)
    await BaseLocale.updateHabilitation(req.baseLocale._id, habilitation._id)
    res.send(habilitation)
  }))

// DONE
app.route('/bases-locales/:baseLocaleId/habilitation/email/send-pin-code')
  .post(ensureIsAdmin, loadHabilitation(), ensurePendingHabilitation, w(async (req, res) => {
    const body = await sendPinCode(req.baseLocale._habilitation)
    return res.status(body.code).send({code: body.code, message: body.message})
  }))

// DONE
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

// DONE
app.route('/bases-locales/:baseLocaleId/tiles/:z/:x/:y.pbf')
  .get(w(async (req, res) => {
    const y = Number.parseInt(req.params.y, 10)
    const x = Number.parseInt(req.params.x, 10)
    const z = Number.parseInt(req.params.z, 10)

    const colorblindMode = req.query.colorblindMode === 'true'

    const geoJson = await BaseLocale.getGeoJsonByTile(req.baseLocale._id, {z, x, y}, colorblindMode)
    const tiles = BaseLocale.getTiles(geoJson, {z, x, y})
    if (tiles === null) {
      return res.status(204).send()
    }

    const pbf = vtpbf.fromGeojsonVt(tiles)

    res.set({
      'Content-Type': 'application/x-protobuf',
      'Content-Encoding': 'gzip'
    })

    res.send(await gzip(Buffer.from(pbf)))
  }))

// DONE
app.route('/bases-locales/:baseLocaleId/populate')
  .post(ensureIsAdmin, w(async (req, res) => {
    const baseLocale = await BaseLocale.populateCommune(req.baseLocale._id)
    res.send(baseLocale)
  }))

// DONE
app.post('/bases-locales/:baseLocaleId/token/renew', ensureIsAdmin, w(async (req, res) => {
  const baseLocale = await BaseLocale.renewToken(req.baseLocale._id)
  res.send(baseLocale)
}))

// DONE
app.route('/bases-locales/:baseLocaleId/voies')
  .post(ensureIsAdmin, w(async (req, res) => {
    const voie = await Voie.create(req.baseLocale, req.body)
    const voieExpanded = await expandVoieOrToponyme(voie, 'voie')
    res.status(201).send(voieExpanded)
  }))
  .get(w(async (req, res) => {
    const voies = await Voie.fetchAll(req.baseLocale._id)
    const voiesExpanded = await expandVoiesOrToponymes(req.baseLocale._id, voies, 'voie')
    res.send(voiesExpanded)
  }))

// DONE
app.route('/bases-locales/:baseLocaleId/voies-deleted')
  .get(w(async (req, res) => {
    const voiesDeleted = await Voie.fetchAllDeleted(req.baseLocale._id)
    res.send(voiesDeleted)
  }))

// DONE
app.route('/bases-locales/:baseLocaleId/toponymes')
  .post(ensureIsAdmin, w(async (req, res) => {
    const toponyme = await Toponyme.create(req.baseLocale._id, req.body)
    const toponymeExpanded = await expandVoieOrToponyme(toponyme, 'toponyme')
    res.status(201).send(toponymeExpanded)
  }))
  .get(w(async (req, res) => {
    const toponymes = await Toponyme.fetchAll(req.baseLocale._id)
    const toponymesExpanded = await expandVoiesOrToponymes(req.baseLocale._id, toponymes, 'toponyme')
    res.send(toponymesExpanded)
  }))

// DONE
app.route('/bases-locales/:baseLocaleId/toponymes-deleted')
  .get(w(async (req, res) => {
    const toponymesDeleted = await Toponyme.fetchAllDeleted(req.baseLocale._id)
    res.send(toponymesDeleted)
  }))

// DONE
app.route('/bases-locales/:baseLocaleId/parcelles')
  .get(w(async (req, res) => {
    const parcelles = await BaseLocale.getAssignedParcelles(req.baseLocale._id)
    res.send(parcelles)
  }))

// OBSOLETTE
app.route('/bases-locales/:baseLocaleId/batch')
  .post(ensureIsAdmin, w(async (req, res) => {
    const batchUpdate = await BaseLocale.batchUpdateNumeros(req.baseLocale._id, req.body)
    res.send(batchUpdate)
  }))

// DONE
app.route('/voies/:voieId')
  .get(w(async (req, res) => {
    const voie = await expandVoieOrToponyme(req.voie, 'voie')
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

// DONE
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

// OBSOLETTE
app.route('/voies/:voieId/batch')
  .post(ensureIsAdmin, w(async (req, res) => {
    const batchUpdate = await Voie.batchUpdateNumeros(req.voie._id, req.body)
    res.send(batchUpdate)
  }))

app.route('/voies/:voieId/convert-to-toponyme')
  .put(ensureIsAdmin, w(async (req, res) => {
    const toponyme = await Voie.convertToToponyme(req.voie._id)
    res.send(toponyme)
  }))

// DONE
app.route('/voies/:voieId/soft-delete')
  .put(ensureIsAdmin, w(async (req, res) => {
    const voie = await Voie.softRemove(req.voie._id, req.body)
    res.send(voie)
  }))

// DONE
app.route('/voies/:voieId/restore')
  .put(ensureIsAdmin, w(async (req, res) => {
    const voie = await Voie.restore(req.voie._id, req.body)
    res.send(voie)
  }))

// DONE
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
    const numero = await Numero.update(req.numero._id, req.body, req.numero)
    res.send(Numero.expandModel(numero))
  }))
  .delete(ensureIsAdmin, w(async (req, res) => {
    await Numero.remove(req.numero._id)
    res.sendStatus(204)
  }))

// DONE
app.route('/numeros/:numeroId/soft-delete')
  .put(ensureIsAdmin, w(async (req, res) => {
    const numero = await Numero.softRemove(req.numero._id)
    res.send(numero)
  }))

// DONE
app.route('/toponymes/:toponymeId')
  .get(w(async (req, res) => {
    const toponyme = await expandVoieOrToponyme(req.toponyme, 'toponyme')
    res.send(toponyme)
  }))
  .put(ensureIsAdmin, w(async (req, res) => {
    const toponyme = await Toponyme.update(req.toponyme._id, req.body)
    res.send(toponyme)
  }))
  .delete(ensureIsAdmin, w(async (req, res) => {
    await Toponyme.remove(req.toponyme._id)
    res.sendStatus(204)
  }))

// DONE
app.route('/toponymes/:toponymeId/restore')
  .put(ensureIsAdmin, w(async (req, res) => {
    const toponyme = await Toponyme.restore(req.toponyme._id)
    res.send(toponyme)
  }))

// DONE
app.route('/toponymes/:toponymeId/soft-delete')
  .put(ensureIsAdmin, w(async (req, res) => {
    const toponyme = await Toponyme.softRemove(req.toponyme._id)
    res.send(toponyme)
  }))
// DONE
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

// DONE
app.route('/commune/:codeCommune')
  .get(w(async (req, res) => {
    if (getCommune(req.params.codeCommune)) {
      const hasCadastre = await checkHasCadastre(req.params.codeCommune)
      const isCOM = await checkIsCOM(req.params.codeCommune)
      const hasMapsStyles = checkHasMapsStyles(req.params.codeCommune, isCOM)

      res.send({hasCadastre, isCOM, ...hasMapsStyles})
    } else {
      throw createError(404, 'Commune inconnue')
    }
  }))

app.use('/stats', stats)

/* Admin routes */

if (process.env.ADMIN_TOKEN) {
  app.use(`/admin/${process.env.ADMIN_TOKEN}`, adminRoutes)
}

app.use(errorHandler)

module.exports = app
