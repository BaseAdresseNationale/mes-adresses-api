const communes = require('@etalab/decoupage-administratif/data/communes.json')
const Joi = require('joi')
const {validPayload} = require('../util/payload')
const mongo = require('../util/mongo')

const validCodeCommune = (codeCommune, helpers) => {
  if (!communes.some(c => c.code === codeCommune && ['commune-actuelle', 'arrondissement-municipal'].includes(c.type))) {
    return helpers.error('any.invalid')
  }

  return codeCommune
}

const createSchema = Joi.object().keys({
  code: Joi.string().custom(validCodeCommune, 'code validation').required(),
  status: Joi.string().valid('demo', 'draft')
})

async function create(idBal, payload) {
  const baseLocale = await mongo.db.collection('bases_locales').findOne({_id: mongo.parseObjectID(idBal)})

  if (!baseLocale) {
    throw new Error('Base locale non trouvée')
  }

  const {code, status} = validPayload(payload, createSchema)

  const commune = {
    code,
    _bal: idBal,
    status: status || 'draft'
  }

  mongo.decorateCreation(commune)

  const {insertedId} = await mongo.db.collection('communes').insertOne(commune)
  commune._id = insertedId

  await mongo.touchDocument('bases_locales', commune._bal, commune._created)

  return commune
}

const updateSchema = Joi.object().keys({
  status: Joi.string().valid('draft', 'ready-to-publish', 'published')
})

async function update(id, payload) {
  const communeChanges = validPayload(payload, updateSchema)

  mongo.decorateModification(communeChanges)

  const {value} = await mongo.db.collection('communes').findOneAndUpdate(
    {_id: mongo.parseObjectID(id)},
    {$set: communeChanges},
    {returnOriginal: false}
  )

  if (!value) {
    throw new Error('Commune not found')
  }

  await mongo.touchDocument('bases_locales', value._bal, value._updated)

  return value
}

async function importMany(idBal, rawCommunes, options = {}) {
  if (!idBal) {
    throw new Error('idBal is required')
  }

  if (options.validate !== false) {
    throw new Error('Validation is not currently available in importMany')
  }

  const communes = rawCommunes
    .map(c => {
      if (!c.code) {
        return null
      }

      const commune = {
        _bal: idBal,
        code: c.code,
        status: c.status || 'draft'
      }

      if (options.keepIds) {
        commune._id = c._id
      }

      if (c._updated && c._created) {
        commune._created = c._created
        commune._updated = c._updated
      } else {
        mongo.decorateCreation(commune)
      }

      return commune
    })
    .filter(Boolean)

  if (communes.length === 0) {
    return
  }

  await mongo.db.collection('communes').insertMany(communes)
}

async function fetchOne(id) {
  return mongo.db.collection('communes').findOne({_id: mongo.parseObjectID(id)})
}

module.exports = {
  create,
  createSchema,
  update,
  updateSchema,
  importMany,
  fetchOne
}
