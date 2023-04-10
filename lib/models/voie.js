const {groupBy, keys, forEach} = require('lodash')
const {getFilteredPayload, addError} = require('../util/payload')
const mongo = require('../util/mongo')
const {validPayload} = require('../util/payload')
const {validateurBAL} = require('../validateur-bal')
const {cleanNom} = require('../util/string')
const Numero = require('./numero')
const Toponyme = require('./toponyme')
const nomAltSchema = require('./nom-alt')

async function validNom(nom, error) {
  const {value, errors} = await validateurBAL(nom, 'voie_nom')

  errors.forEach(err => {
    addError(error, 'nom', err)
  })

  return value
}

async function validCode(code, error) {
  if (!code.match(/^[\dA-Z]\d{3}$/)) {
    addError(error, 'code', 'Le code voie est invalide')
  }
}

async function validTrace(trace, error) {
  if (trace.type && trace.coordinates) {
    if (trace.type !== 'LineString') {
      addError(error, 'trace', 'Le champ "trace.type" doit avoir pour valeur : "LineString"')
    }

    if (!Array.isArray(trace.coordinates)) {
      addError(error, 'trace', 'Le valeur du champ "type.coordinates" est incorrecte')
    }
  } else {
    addError(error, 'trace', 'Le champ "trace" est invalide, "type" et "coordinates" sont obligatoires')
  }
}

async function validTypeNumerotation(typeNumerotation, error) {
  if (!['numerique', 'metrique'].includes(typeNumerotation)) {
    addError(error, 'typeNumerotation', 'La valeur du champ typeNumerotation est incorrecte, seules "numerique" et "metrique" sont autorisées')
  }
}

const createSchema = {
  nom: {valid: validNom, isRequired: true, nullAllowed: false, type: 'string'},
  nomAlt: nomAltSchema.createSchema,
  typeNumerotation: {valid: validTypeNumerotation, isRequired: false, nullAllowed: false, type: 'string'},
  trace: {valid: validTrace, isRequired: false, nullAllowed: true, type: 'object'},
}

const updateSchema = {
  nom: {valid: validNom, isRequired: false, nullAllowed: false, type: 'string'},
  nomAlt: nomAltSchema.updateSchema,
  code: {valid: validCode, isRequired: false, nullAllowed: true, type: 'string'},
  typeNumerotation: {valid: validTypeNumerotation, isRequired: false, nullAllowed: false, type: 'string'},
  trace: {valid: validTrace, isRequired: false, nullAllowed: true, type: 'object'}
}

async function create(baseLocale, payload) {
  if (payload.nom) {
    payload.nom = cleanNom(payload.nom)
  }

  if (payload.nomAlt) {
    payload.nomAlt = nomAltSchema.cleanNomAlt(payload.nomAlt)
  }

  const voie = await validPayload(payload, createSchema)

  voie._id = new mongo.ObjectId()
  voie._bal = baseLocale._id
  voie.code = null
  voie.commune = baseLocale.commune
  voie.typeNumerotation = voie.typeNumerotation || 'numerique'
  voie.trace = voie.trace || null
  voie.nomAlt = nomAltSchema.getNomAltDefault(voie.nomAlt)

  mongo.decorateCreation(voie)

  await mongo.db.collection('voies').insertOne(voie)
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
      voie.nomAlt = nomAltSchema.getNomAltDefault(v.nomAlt)

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

async function update(id, payload) {
  if (payload.nom) {
    payload.nom = cleanNom(payload.nom)
  }

  if (payload.nomAlt) {
    payload.nomAlt = nomAltSchema.cleanNomAlt(payload.nomAlt)
  }

  const voieChanges = await validPayload(payload, updateSchema)

  if (voieChanges.nomAlt) {
    voieChanges.nomAlt = nomAltSchema.getNomAltDefault(voieChanges.nomAlt)
  }

  mongo.decorateModification(voieChanges)
  const {value} = await mongo.db.collection('voies').findOneAndUpdate(
    {_id: mongo.parseObjectID(id), _deleted: null},
    {$set: voieChanges},
    {returnDocument: 'after'}
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

async function fetchAll(idBal) {
  return mongo.db.collection('voies').find({
    _bal: idBal,
    _deleted: null
  }).toArray()
}

async function fetchAllDeleted(idBal) {
  const numerosDeleted = await mongo.db.collection('numeros').find({
    _bal: idBal,
    _deleted: {$ne: null}
  }).toArray()

  const numerosByVoieId = groupBy(numerosDeleted, 'voie')
  const voies = await mongo.db.collection('voies').find({
    _bal: idBal,
    $or: [
      {_id: {$in: keys(numerosByVoieId).map(id => mongo.parseObjectID(id))}},
      {_deleted: {$ne: null}}
    ]
  }).toArray()

  forEach(voies, voie => {
    voie.numeros = numerosByVoieId[voie._id] || []
  })
  return voies
}

async function restore(voieId, body) {
  const {numerosIds} = body
  const numeros = numerosIds.map(id => {
    const objectID = mongo.parseObjectID(id)

    if (!objectID) {
      throw new Error('Identifiant incorrect')
    }

    return objectID
  })

  const now = new Date()

  const {value} = await mongo.db.collection('voies').findOneAndUpdate(
    {_id: mongo.parseObjectID(voieId)},
    {$set: {
      _deleted: null,
      _updated: now
    }},
    {returnDocument: 'after'}
  )

  if (!value) {
    throw new Error('Voie not found')
  }

  const {modifiedCount} = await mongo.db.collection('numeros').updateMany({
    $and: [
      {voie: mongo.parseObjectID(voieId)},
      {_id: {$in: numeros}},
    ]
  }, {
    $set: {
      _deleted: null,
      _updated: now
    }
  })

  if (modifiedCount > 0) {
    await Promise.all([
      mongo.touchDocument('bases_locales', value._bal, now),
    ])
  }

  return {modifiedCount}
}

async function softRemove(id) {
  const now = new Date()
  const {value} = await mongo.db.collection('voies').findOneAndUpdate(
    {_id: mongo.parseObjectID(id)},
    {$set: {
      _deleted: now,
      _updated: now
    }},
    {returnDocument: 'after'}
  )

  if (!value) {
    throw new Error('Voie not found')
  }

  await mongo.db.collection('numeros').updateMany(
    {voie: mongo.parseObjectID(id)},
    {$set: {
      _deleted: now,
      _updated: now
    }}
  )

  // Update base locales
  await mongo.touchDocument('bases_locales', value._bal)
  return value
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

async function batchUpdateNumeros(idVoie, changes) {
  const now = new Date()
  const {certifie} = await validPayload(changes, Numero.updateSchema)

  const voie = await mongo.db.collection('voies').findOne({
    _id: mongo.parseObjectID(idVoie),
    _deleted: null
  })
  if (!voie) {
    throw new Error('Voie not found')
  }

  const {modifiedCount} = await mongo.db.collection('numeros').updateMany({
    $and: [
      {voie: mongo.parseObjectID(idVoie)},
      {_deleted: null},
      {certifie: {$ne: Boolean(certifie)}}
    ]
  }, {
    $set: {certifie: Boolean(certifie), _updated: now}
  })

  if (modifiedCount > 0) {
    await Promise.all([
      mongo.touchDocument('bases_locales', voie._bal, now),
      mongo.touchDocument('voies', voie._id, now)
    ])
  }

  return {changes: {certifie}, modifiedCount}
}

async function convertToToponyme(idVoie) {
  const voie = await mongo.db.collection('voies').findOne({
    _id: mongo.parseObjectID(idVoie),
    _deleted: null
  })
  if (!voie) {
    throw new Error('Voie not found')
  }

  // CHECK VOIE HAS NO NUMERO
  const numerosCount = await mongo.db.collection('numeros').countDocuments({
    voie: idVoie,
    _deleted: null
  })
  if (numerosCount > 0) {
    throw new Error('Voie has numero(s)')
  }

  // CREATE TOPONYME
  const payload = {
    nom: voie.nom,
    nomAlt: voie.nomAlt,
  }
  const toponyme = await Toponyme.create(voie._bal, payload)
  // DELETE VOIE
  await remove(voie._id)
  // UPDATE DATE BASE LOCAL
  await mongo.touchDocument('bases_locales', toponyme._bal, toponyme._created)
  // RETURN NEW TOPONYME
  return toponyme
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
  batchUpdateNumeros,
  convertToToponyme,
  fetchAllDeleted,
  restore,
  softRemove
}
