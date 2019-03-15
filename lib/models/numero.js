const Joi = require('joi')
const {getFilteredPayload} = require('../util/payload')
const mongo = require('../util/mongo')
const position = require('./position')

const createSchema = Joi.object().keys({
  numero: Joi.number().min(0).max(9999).integer().required(),
  suffixe: Joi.string().regex(/^[a-z][a-z0-9]*$/).max(10),
  positions: Joi.array().items(
    Joi.lazy(() => position.createSchema).description('position schema')
  )
})

async function create(idVoie, payload) {
  const numero = getFilteredPayload(payload, createSchema)
  Joi.assert(numero, createSchema)

  const voie = await mongo.db.collection('voies').findOne({_id: mongo.parseObjectID(idVoie)})

  if (!voie) {
    throw new Error('Voie not found')
  }

  numero._bal = voie._bal
  numero.commune = voie.commune
  numero.voie = idVoie

  numero.suffixe = numero.suffixe || null
  numero.positions = numero.positions || []

  mongo.decorateCreation(numero)

  const {insertedId} = await mongo.db.collection('numeros').insertOne(numero)
  numero._id = insertedId
  return numero
}

async function importMany(idVoie, rawNumeros, options = {}) {
  if (options.validate !== false) {
    throw new Error('Validation is not currently available in importMany')
  }

  const numeros = rawNumeros
    .map(n => {
      const numero = getFilteredPayload(n, createSchema)

      if (options.keepIds) {
        numero._id = n._id
      }

      numero._bal = idVoie._bal
      numero.commune = n.commune
      numero.voie = idVoie

      numero.suffixe = n.suffixe || null
      numero.positions = n.positions || []

      mongo.decorateCreation(numero)

      return numero
    })

  await mongo.db.collection('numeros').insertMany(numeros)
}

async function update(id, payload) {
  const numeroChanges = getFilteredPayload(payload, updateSchema)
  Joi.assert(numeroChanges, updateSchema)

  mongo.decorateModification(numeroChanges)

  const {value} = await mongo.db.collection('numeros').findOneAndUpdate(
    {_id: mongo.parseObjectID(id)},
    {$set: numeroChanges},
    {returnOriginal: false}
  )

  if (!value) {
    throw new Error('Numero not found')
  }

  return value
}

async function fetchOne(id) {
  return mongo.db.collection('numeros').findOne({_id: mongo.parseObjectID(id)})
}

async function fetchAll(idVoie) {
  return mongo.db.collection('numeros').find({voie: idVoie}).toArray()
}

async function remove(id) {
  await mongo.db.collection('numeros').deleteOne({_id: mongo.parseObjectID(id)})
}

const updateSchema = createSchema

module.exports = {
  create,
  createSchema,
  importMany,
  update,
  updateSchema,
  fetchOne,
  fetchAll,
  remove
}
