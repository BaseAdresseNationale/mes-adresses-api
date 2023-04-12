const {uniqBy, omit, assign} = require('lodash')
const createError = require('http-errors')
const {getFilteredPayload, addError, validSchema} = require('../util/payload')
const mongo = require('../util/mongo')
const {validPayload} = require('../util/payload')
const {validateurBAL} = require('../validateur-bal')
const positionModel = require('./position')

function validObjectID(id) {
  if (id && mongo.ObjectId.isValid(id)) {
    return mongo.ObjectId.createFromHexString(id)
  }

  return false
}

async function validNumero(numero, error) {
  const {value, errors} = await validateurBAL(numero.toString(), 'numero')

  errors.forEach(err => {
    addError(error, 'numero', err)
  })

  return value || numero
}

async function validSuffixe(suffixe, error) {
  const {value, errors} = await validateurBAL(suffixe.toString(), 'suffixe')

  errors.forEach(err => {
    addError(error, 'suffixe', err)
  })

  return value || suffixe
}

async function validComment(comment, error) {
  if (comment.length > 5000) {
    addError(error, 'comment', 'Le commentaire est trop long (5000 caractères maximum)')
  }
}

async function validPositions(positions, error) {
  positions.forEach(async position => {
    const result = await validSchema(position, positionModel.createSchema)
    assign(error, result.error)
  })
}

async function validVoie(voie, error) {
  const objectID = validObjectID(voie)
  if (objectID) {
    return objectID
  }

  addError(error, 'voie', 'La valeur du champ voie est incorrecte')
}

async function validToponyme(toponyme, error) {
  const objectID = validObjectID(toponyme)
  if (objectID) {
    return objectID
  }

  addError(error, 'toponyme', 'La valeur du champ toponyme est incorrecte')
}

async function validParcelles(parcelles, error) {
  if (parcelles.length > 0) {
    const {value, errors} = await validateurBAL(parcelles.join('|'), 'cad_parcelles')

    errors.forEach(err => {
      addError(error, 'parcelles', err)
    })

    return value
  }
}

async function validCommuneDeleguee(commune, error) {
  const {value, errors} = await validateurBAL(commune, 'commune_deleguee_insee')

  errors.forEach(err => {
    addError(error, 'communeDelegueInsee', err)
  })

  return value || commune
}

const createSchema = {
  numero: {valid: validNumero, isRequired: true, nullAllowed: false, type: 'number'},
  suffixe: {valid: validSuffixe, isRequired: false, nullAllowed: true, type: 'string'},
  comment: {valid: validComment, isRequired: false, nullAllowed: true, type: 'string'},
  positions: {valid: validPositions, isRequired: false, nullAllowed: false, type: 'array'},
  toponyme: {valid: validToponyme, isRequired: false, nullAllowed: true, type: 'string'},
  parcelles: {valid: validParcelles, isRequired: false, nullAllowed: false, type: 'array'},
  certifie: {valid: null, isRequired: false, nullAllowed: false, type: 'boolean'},
  communeDeleguee: {valid: validCommuneDeleguee, isRequired: false, nullAllowed: true, type: 'string'}
}

const updateSchema = {
  voie: {valid: validVoie, isRequired: false, nullAllowed: false, type: 'string'},
  numero: {valid: validNumero, isRequired: false, nullAllowed: false, type: 'number'},
  suffixe: {valid: validSuffixe, isRequired: false, nullAllowed: true, type: 'string'},
  comment: {valid: validComment, isRequired: false, nullAllowed: true, type: 'string'},
  positions: {valid: validPositions, isRequired: false, nullAllowed: false, type: 'array'},
  toponyme: {valid: validToponyme, isRequired: false, nullAllowed: true, type: 'string'},
  parcelles: {valid: validParcelles, isRequired: false, nullAllowed: false, type: 'array'},
  certifie: {valid: null, isRequired: false, nullAllowed: false, type: 'boolean'},
  communeDeleguee: {valid: validCommuneDeleguee, isRequired: false, nullAllowed: true, type: 'string'}
}

const batchUpdateSchema = {
  voie: {valid: validVoie, isRequired: false, nullAllowed: true, type: 'string'},
  positionType: {valid: positionModel.validPositionType, isRequired: false, nullAllowed: true, type: 'string'},
  comment: {valid: validComment, isRequired: false, nullAllowed: true, type: 'string'},
  toponyme: {valid: validToponyme, isRequired: false, nullAllowed: true, type: 'string'},
  certifie: {valid: null, isRequired: false, nullAllowed: false, type: 'boolean'},
  communeDeleguee: {valid: validCommuneDeleguee, isRequired: false, nullAllowed: true, type: 'string'}
}

async function create(idVoie, payload) {
  const numero = await validPayload(payload, createSchema)

  const voie = await mongo.db.collection('voies').findOne({_id: mongo.parseObjectID(idVoie)})

  if (!voie) {
    throw new Error('Voie not found')
  }

  numero._id = new mongo.ObjectId()
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

  await mongo.db.collection('numeros').insertOne(numero)

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

function filterSensitiveFields(numero) {
  return omit(numero, 'comment')
}

async function update(id, payload) {
  const numeroChanges = await validPayload(payload, updateSchema)

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
    {returnDocument: 'after'}
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
  const {numerosIds, changes} = body
  const {voie, certifie, positionType, toponyme, comment, communeDeleguee} = await validPayload(changes, batchUpdateSchema)

  if (voie) {
    const voieRequested = await mongo.db.collection('voies').findOne({
      _id: mongo.parseObjectID(voie),
      _bal: idBal
    })

    if (!voieRequested) {
      throw createError(404, 'Voie not found')
    }
  }

  if (toponyme) {
    const toponymeRequested = await mongo.db.collection('toponymes').findOne({
      _id: mongo.parseObjectID(toponyme),
      _bal: idBal
    })

    if (!toponymeRequested) {
      throw createError(404, 'Toponyme not found')
    }
  }

  const now = new Date()
  const numeros = numerosIds.map(id => {
    const objectID = mongo.parseObjectID(id)

    if (!objectID) {
      throw createError(400, 'Identifiant incorrect')
    }

    return objectID
  })

  // Changes to apply to numeros
  const batchChanges = {}

  // Conditions where a numero must be updated.
  const batchConditions = []

  // Now we build conditions and changes according to batch update parameters

  if (voie) {
    batchConditions.push({voie: {$ne: voie}})
    batchChanges.voie = voie
  }

  if (certifie !== undefined) {
    batchConditions.push({
      certifie: {$ne: certifie}
    })
    batchChanges.certifie = certifie
  }

  if (positionType) {
    batchConditions.push({'positions.0.type': {$ne: positionType}})
    batchChanges['positions.0.type'] = positionType
  }

  if (toponyme !== undefined) {
    batchConditions.push({toponyme: {$ne: toponyme}})
    batchChanges.toponyme = toponyme
  }

  if (comment !== undefined) {
    batchConditions.push({comment: {$ne: comment}})
    batchChanges.comment = comment
  }

  if (communeDeleguee !== undefined) {
    batchConditions.push({communeDeleguee: {$ne: communeDeleguee}})
    batchChanges.communeDeleguee = communeDeleguee
  }

  if (Object.keys(batchChanges) === 0) {
    return {changes: {}, modifiedCount: 0}
  }

  const {modifiedCount} = await mongo.db.collection('numeros').updateMany({
    _id: {$in: numeros},
    $or: batchConditions
  }, {$set: {...batchChanges, _updated: now}})

  if (modifiedCount > 0) {
    // Now we want to update Voie._updated when necessary
    // We collect related Voie._id
    const updatedVoies = await mongo.db.collection('numeros').distinct('voie', {
      _id: {$in: numeros},
      _bal: idBal,
      _updated: now
    })

    // We update Voie._updated when older than 'now'
    await mongo.db.collection('voies').updateMany({
      _id: {$in: updatedVoies},
      _updated: {$lt: now}
    }, {$set: {_updated: now}})

    // And now we update BaseLocale._updated
    await mongo.touchDocument('bases_locales', idBal, now)
  }

  return {changes: {voie, certifie, positionType, toponyme, comment, communeDeleguee}, modifiedCount}
}

async function batchRemoveNumeros(idBal, body) {
  const {numerosIds} = body
  const numeros = numerosIds.map(id => {
    const objectID = mongo.parseObjectID(id)

    if (!objectID) {
      throw createError(400, 'Identifiant incorrect')
    }

    return objectID
  })

  const voieIds = await mongo.db.collection('numeros').distinct('voie', {
    _id: {$in: numeros},
    _bal: idBal
  })

  const {deletedCount} = await mongo.db.collection('numeros').deleteMany({
    _id: {$in: numeros},
    _bal: idBal
  })

  await Promise.all([
    mongo.touchDocument('bases_locales', idBal),
    mongo.touchDocumentWithManyIds('voies', voieIds)
  ])

  return {deletedCount}
}

module.exports = {
  create,
  createSchema,
  validPositions,
  validParcelles,
  importMany,
  filterSensitiveFields,
  update,
  updateSchema,
  fetchOne,
  fetchAll,
  fetchByToponyme,
  remove,
  expandModel,
  normalizeSuffixe,
  batchUpdateNumeros,
  batchRemoveNumeros
}
