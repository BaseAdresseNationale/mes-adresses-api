const Joi = require('joi')
const {getFilteredPayload} = require('../util/payload')
const mongo = require('../util/mongo')
const {validPayload} = require('../util/payload')
const position = require('./position')

function cleanNom(nom) {
  return nom.replace(/^\s+/g, '').replace(/\s+$/g, '').replace(/\s\s+/g, ' ')
}

const createSchema = Joi.object().keys({
  nom: Joi.string().min(1).max(200).required(),
  positions: Joi.array().items(
    Joi.lazy(() => position.createSchema).description('position schema')
  ),
  complement: Joi.string().max(200).allow(null)
})

async function create(idBal, codeCommune, payload) {
  if (payload.nom) {
    payload.nom = cleanNom(payload.nom)
  }

  const voie = validPayload(payload, createSchema)

  voie._bal = idBal
  voie.code = null
  voie.commune = codeCommune
  voie.positions = voie.positions || []
  voie.complement = voie.complement || null

  mongo.decorateCreation(voie)

  const {insertedId} = await mongo.db.collection('voies').insertOne(voie)
  voie._id = insertedId

  await mongo.touchDocument('bases_locales', voie._bal, voie._created)

  return voie
}

async function importMany(idBal, rawVoies, options = {}) {
  if (!idBal) {
    throw new Error('idBal is required')
  }

  if (options.validate !== false) {
    throw new Error('Validation is not currently available in importMany')
  }

  const voies = rawVoies
    .map(v => {
      if (v.nom) {
        v.nom = cleanNom(v.nom)
      }

      const voie = getFilteredPayload(v, createSchema)

      if (!v.commune || !v.nom) {
        return null
      }

      if (options.keepIds) {
        voie._id = v._id
      }

      voie._bal = idBal
      voie.code = v.code || null
      voie.commune = v.commune
      voie.positions = v.positions || []
      voie.complement = v.complement

      if (v._updated && v._created) {
        voie._created = v._created
        voie._updated = v._updated
      } else {
        mongo.decorateCreation(voie)
      }

      return voie
    })
    .filter(Boolean)

  if (voies.length === 0) {
    return
  }

  await mongo.db.collection('voies').insertMany(voies)
}

const updateSchema = Joi.object().keys({
  nom: Joi.string().min(1).max(200),
  code: Joi.string().regex(/^[0-9A-Z]\d{3}$/).allow(null),
  positions: Joi.array().items(
    Joi.lazy(() => position.createSchema).description('position schema')
  ),
  complement: Joi.string().max(200).allow(null)
})

async function update(id, payload) {
  if (payload.nom) {
    payload.nom = cleanNom(payload.nom)
  }

  const voieChanges = validPayload(payload, updateSchema)

  mongo.decorateModification(voieChanges)
  const {value} = await mongo.db.collection('voies').findOneAndUpdate(
    {_id: mongo.parseObjectID(id)},
    {$set: voieChanges},
    {returnOriginal: false}
  )

  if (!value) {
    throw new Error('Voie not found')
  }

  await mongo.touchDocument('bases_locales', value._bal, value._updated)

  return value
}

async function fetchOne(id) {
  return mongo.db.collection('voies').findOne({_id: mongo.parseObjectID(id)})
}

async function fetchAll(idBal, codeCommune) {
  return mongo.db.collection('voies').find({
    _bal: idBal,
    commune: codeCommune
  }).toArray()
}

async function remove(id) {
  const {value} = await mongo.db.collection('voies').findOneAndDelete({
    _id: mongo.parseObjectID(id)
  })

  // The following instructions could be defered
  await mongo.db.collection('numeros').deleteMany({voie: mongo.parseObjectID(id)})

  // Update base locales
  await mongo.touchDocument('bases_locales', value._bal)
}

module.exports = {
  create,
  importMany,
  createSchema,
  update,
  updateSchema,
  fetchOne,
  fetchAll,
  remove,
  cleanNom
}
