const Joi = require('joi')
const mongo = require('../util/mongo')
const {validPayload} = require('../util/payload')
const {getFilteredPayload} = require('../util/payload')
const position = require('./position')
const {cleanNom} = require('./voie')

const createSchema = Joi.object().keys({
  nom: Joi.string().min(1).max(200).required(),
  positions: Joi.array().items(
    position.createSchema
  ),
  parcelles: Joi.array().items(
    Joi.string().regex(/^[A-Z\d]+$/).length(14)
  ).default([])
})

async function create(idBal, codeCommune, payload) {
  if (payload.nom) {
    payload.nom = cleanNom(payload.nom)
  }

  const toponyme = validPayload(payload, createSchema)
  const baseLocale = await mongo.db.collection('bases_locales').findOne({_id: mongo.parseObjectID(idBal)})

  if (!baseLocale) {
    throw new Error('Base locale not found')
  }

  toponyme._id = new mongo.ObjectId()
  toponyme._bal = baseLocale._id
  toponyme.commune = codeCommune
  toponyme.positions = toponyme.positions || []
  toponyme.parcelles = toponyme.parcelles || []

  mongo.decorateCreation(toponyme)

  await mongo.db.collection('toponymes').insertOne(toponyme)
  await mongo.touchDocument('bases_locales', toponyme._bal, toponyme._created)

  return toponyme
}

const updateSchema = Joi.object().keys({
  nom: Joi.string().min(1).max(200),
  positions: Joi.array().items(
    position.createSchema
  ),
  parcelles: Joi.array().items(
    Joi.string().regex(/^[A-Z\d]+$/).length(14)
  ).default([])
})

async function update(id, payload) {
  if (payload.nom) {
    payload.nom = cleanNom(payload.nom)
  }

  const toponymeChanges = validPayload(payload, updateSchema)

  mongo.decorateModification(toponymeChanges)
  const {value} = await mongo.db.collection('toponymes').findOneAndUpdate(
    {_id: mongo.parseObjectID(id)},
    {$set: toponymeChanges},
    {returnDocument: 'after'}
  )

  if (!value) {
    throw new Error('Toponyme not found')
  }

  await mongo.touchDocument('bases_locales', value._bal, value._updated)

  return value
}

async function importMany(idBal, rawToponymes, options = {}) {
  if (!idBal) {
    throw new Error('idBal is required')
  }

  if (options.validate !== false) {
    throw new Error('Validation is not currently available in importMany')
  }

  const toponymes = rawToponymes
    .map(t => {
      if (t.nom) {
        t.nom = cleanNom(t.nom)
      }

      const toponyme = getFilteredPayload(t, createSchema)

      if (!t.commune || !t.nom) {
        return null
      }

      if (options.keepIds) {
        toponyme._id = t._id
      }

      toponyme._bal = idBal
      toponyme.commune = t.commune
      toponyme.positions = t.positions || []
      toponyme.parcelles = t.parcelles || []

      if (t._updated && t._created) {
        toponyme._created = t._created
        toponyme._updated = t._updated
      } else {
        mongo.decorateCreation(toponyme)
      }

      return toponyme
    })
    .filter(Boolean)

  if (toponymes.length === 0) {
    return
  }

  await mongo.db.collection('toponymes').insertMany(toponymes)
}

async function fetchOne(id) {
  return mongo.db.collection('toponymes').findOne({_id: mongo.parseObjectID(id)})
}

async function fetchAll(idBal, codeCommune) {
  return mongo.db.collection('toponymes').find({
    _bal: idBal,
    commune: codeCommune
  }).toArray()
}

async function remove(id) {
  // On supprime d'abord les références à ce toponyme
  await mongo.db.collection('numeros').updateMany(
    {toponyme: id},
    {$set: {toponyme: null}}
  )

  const {value} = await mongo.db.collection('toponymes').findOneAndDelete({
    _id: mongo.parseObjectID(id)
  })

  if (value) {
    const now = new Date()
    await mongo.touchDocument('bases_locales', value._bal, now)
  }
}

module.exports = {
  create,
  createSchema,
  update,
  importMany,
  updateSchema,
  fetchOne,
  fetchAll,
  remove
}
