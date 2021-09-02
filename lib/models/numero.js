const Joi = require('joi')
const {getFilteredPayload} = require('../util/payload')
const mongo = require('../util/mongo')
const {validPayload} = require('../util/payload')
const position = require('./position')
const {uniqBy} = require('lodash')

const createSchema = Joi.object().keys({
  numero: Joi.number().min(0).max(9999).integer().required(),
  suffixe: Joi.string().regex(/^[a-z\d]+$/i).max(10).allow(null),
  comment: Joi.string().max(5000).allow(null),
  positions: Joi.array().items(
    position.createSchema
  ),
  toponyme: Joi.string().custom(validObjectID).allow(null),
  parcelles: Joi.array().items(
    Joi.string().regex(/^[A-Z\d]+$/).length(14)
  ).default([]),
  certifie: Joi.boolean().default(false)
})

function validObjectID(id) {
  if (id) {
    const objectID = mongo.ObjectID.createFromHexString(id)
    if (mongo.ObjectID.isValid(id)) {
      return objectID
    }

    throw new Error('ObjectID is invalid')
  }
}

async function create(idVoie, payload) {
  const numero = validPayload(payload, createSchema)

  const voie = await mongo.db.collection('voies').findOne({_id: mongo.parseObjectID(idVoie)})

  if (!voie) {
    throw new Error('Voie not found')
  }

  numero._bal = voie._bal
  numero.commune = voie.commune
  numero.voie = idVoie

  numero.suffixe = numero.suffixe ? normalizeSuffixe(numero.suffixe) : null

  numero.positions = numero.positions || []
  numero.comment = numero.comment || null
  numero.parcelles = numero.parcelles || []
  numero.certifie = numero.certifie || false

  if (numero.toponyme) {
    const toponyme = await mongo.db.collection('toponymes').findOne({
      _id: mongo.parseObjectID(numero.toponyme)
    })

    if (!toponyme) {
      throw new Error('Toponyme not found')
    }

    numero.toponyme = toponyme._id
  } else {
    numero.toponyme = null
  }

  mongo.decorateCreation(numero)

  const {insertedId} = await mongo.db.collection('numeros').insertOne(numero)
  numero._id = insertedId

  await Promise.all([
    mongo.touchDocument('bases_locales', numero._bal, numero._created),
    mongo.touchDocument('voies', numero.voie, numero._created)
  ])

  return numero
}

async function importMany(idBal, rawNumeros, options = {}) {
  if (!idBal) {
    throw new Error('idBal is required')
  }

  if (options.validate !== false) {
    throw new Error('Validation is not currently available in importMany')
  }

  const numeros = rawNumeros
    .map(n => {
      const numero = getFilteredPayload(n, createSchema)

      if (!n.commune || !n.voie || !n.numero) {
        return null
      }

      numero._bal = idBal
      numero.commune = n.commune
      numero.voie = n.voie

      if (n.suffixe) {
        numero.suffixe = normalizeSuffixe(n.suffixe)
      }

      numero.positions = n.positions || []

      numero.parcelles = n.parcelles || []

      numero.certifie = n.certifie || false

      if (n._updated && n._created) {
        numero._created = n._created
        numero._updated = n._updated
      } else {
        mongo.decorateCreation(numero)
      }

      return numero
    })
    .filter(Boolean)

  if (numeros.length === 0) {
    return
  }

  await mongo.db.collection('numeros').insertMany(numeros)
}

const updateSchema = Joi.object().keys({
  numero: Joi.number().min(0).max(9999).integer(),
  voie: Joi.string().custom(validObjectID),
  suffixe: Joi.string().regex(/^[a-z\d]+$/i).max(10).allow(null),
  comment: Joi.string().max(5000).allow(null),
  positions: Joi.array().items(
    position.createSchema
  ),
  toponyme: Joi.string().custom(validObjectID).allow(null),
  parcelles: Joi.array().items(
    Joi.string().regex(/^[A-Z\d]+$/).length(14)
  ).default([]),
  certifie: Joi.boolean()
})

async function update(id, payload) {
  const numeroChanges = validPayload(payload, updateSchema)

  if (numeroChanges.voie) {
    const voie = await mongo.db.collection('voies').findOne({
      _id: mongo.parseObjectID(numeroChanges.voie)
    })

    if (!voie) {
      throw new Error('Voie not found')
    }

    numeroChanges.voie = voie._id
  }

  if (numeroChanges.toponyme) {
    const toponyme = await mongo.db.collection('toponymes').findOne({
      _id: mongo.parseObjectID(numeroChanges.toponyme)
    })

    if (!toponyme) {
      throw new Error('Toponyme not found')
    }

    numeroChanges.toponyme = toponyme._id
  }

  if (numeroChanges.suffixe) {
    numeroChanges.suffixe = normalizeSuffixe(numeroChanges.suffixe)
  }

  mongo.decorateModification(numeroChanges)

  const {value} = await mongo.db.collection('numeros').findOneAndUpdate(
    {_id: mongo.parseObjectID(id)},
    {$set: numeroChanges},
    {returnOriginal: false}
  )

  if (!value) {
    throw new Error('Numero not found')
  }

  await Promise.all([
    mongo.touchDocument('bases_locales', value._bal, value._updated),
    mongo.touchDocument('voies', value.voie, value._updated)
  ])

  return value
}

async function fetchOne(id) {
  return mongo.db.collection('numeros').findOne({_id: mongo.parseObjectID(id)})
}

async function fetchAll(idVoie) {
  return mongo.db.collection('numeros').find({voie: idVoie}).sort({numero: 1}).toArray()
}

async function fetchByToponyme(id) {
  const numerosWithToponyme = await mongo.db.collection('numeros').find({toponyme: id}).toArray()
  const voiesIds = uniqBy(numerosWithToponyme.map(n => n.voie), voieId => voieId.toString())
  const voies = await mongo.db.collection('voies').find({_id: {$in: voiesIds}}).toArray()

  const numerosToponymeWithNomVoie = numerosWithToponyme.map(n => {
    const {_id, nom} = voies.find(({_id}) => _id.toHexString() === n.voie.toHexString())
    return {
      ...n,
      voie: {
        _id,
        nom
      }
    }
  })

  return numerosToponymeWithNomVoie
}

async function remove(id) {
  const {value} = await mongo.db.collection('numeros').findOneAndDelete({
    _id: mongo.parseObjectID(id)
  })

  if (value) {
    const now = new Date()
    await Promise.all([
      mongo.touchDocument('bases_locales', value._bal, now),
      mongo.touchDocument('voies', value.voie, now)
    ])
  }
}

function displaySuffix(suffix) {
  if (suffix) {
    return suffix.trim().match(/^\d/) ? (
      '-' + suffix.trim()
    ) : (
      suffix.trim()
    )
  }

  return ''
}

function expandModel(numero) {
  return {
    ...numero,
    numeroComplet: numero.numero + displaySuffix(numero.suffixe)
  }
}

function normalizeSuffixe(suffixe) {
  return suffixe.toLowerCase().trim()
}

async function batchUpdateNumeros(idBal, body) {
  const {numeros, ...changes} = body
  const {certifie} = validPayload(changes, updateSchema)

  const now = new Date()
  const formattedNumerosIds = mongo.parseObjectIDList(numeros)

  const {modifiedCount} = await mongo.db.collection('numeros').updateMany({
    $and: [
      {_id: {$in: formattedNumerosIds}},
      {certifie: {$ne: Boolean(certifie)}}
    ]
  }, {
    $set: {certifie: Boolean(certifie), _updated: now}
  })

  if (modifiedCount) {
    const updatedVoies = await mongo.db.collection('numeros').distinct('voie', {
      _id: {$in: formattedNumerosIds},
      certifie: {$eq: certifie},
      _updated: now
    })
    const formattedVoieIds = mongo.parseObjectIDList(updatedVoies)

    await Promise.all([
      mongo.touchDocument('bases_locales', idBal, now),
      mongo.touchDocumentWithManyIds('voies', formattedVoieIds, now)
    ])
  }

  return {modifiedCount}
}

module.exports = {
  create,
  createSchema,
  importMany,
  update,
  updateSchema,
  fetchOne,
  fetchAll,
  fetchByToponyme,
  remove,
  expandModel,
  normalizeSuffixe,
  batchUpdateNumeros
}
