const mongo = require('../util/mongo')
const {validPayload, addError, getFilteredPayload} = require('../util/payload')
const {validateurBAL} = require('../validateur-bal')
const {cleanNom} = require('../util/string')
const nomAltSchema = require('./nom-alt')
const {validPositions, validParcelles} = require('./numero')

async function validNom(nom, error) {
  const {value, errors} = await validateurBAL(nom, 'voie_nom')

  errors.forEach(err => {
    addError(error, 'nom', err.replace('de la voie', 'du toponyme'))
  })

  return value
}

const createSchema = {
  nom: {valid: validNom, isRequired: true, nullAllowed: false, type: 'string'},
  nomAlt: nomAltSchema.createSchema,
  positions: {valid: validPositions, isRequired: false, nullAllowed: false, type: 'array'},
  parcelles: {valid: validParcelles, isRequired: false, nullAllowed: true, type: 'array'}
}

const updateSchema = {
  nom: {valid: validNom, isRequired: false, nullAllowed: false, type: 'string'},
  nomAlt: nomAltSchema.updateSchema,
  positions: {valid: validPositions, isRequired: false, nullAllowed: false, type: 'array'},
  parcelles: {valid: validParcelles, isRequired: false, nullAllowed: true, type: 'array'}
}

async function create(idBal, payload) {
  if (payload.nom) {
    payload.nom = cleanNom(payload.nom)
  }

  if (payload.nomAlt) {
    payload.nomAlt = nomAltSchema.cleanNomAlt(payload.nomAlt)
  }

  const toponyme = await validPayload(payload, createSchema)
  const baseLocale = await mongo.db.collection('bases_locales').findOne({_id: mongo.parseObjectID(idBal)})

  if (!baseLocale) {
    throw new Error('Base locale not found')
  }

  toponyme._id = new mongo.ObjectId()
  toponyme._bal = baseLocale._id
  toponyme.commune = baseLocale.commune
  toponyme.positions = toponyme.positions || []
  toponyme.parcelles = toponyme.parcelles || []
  toponyme.nomAlt = nomAltSchema.getNomAltDefault(toponyme.nomAlt)

  mongo.decorateCreation(toponyme)

  await mongo.db.collection('toponymes').insertOne(toponyme)
  await mongo.touchDocument('bases_locales', toponyme._bal, toponyme._created)

  return toponyme
}

async function update(id, payload) {
  if (payload.nom) {
    payload.nom = cleanNom(payload.nom)
  }

  if (payload.nomAlt) {
    payload.nomAlt = nomAltSchema.cleanNomAlt(payload.nomAlt)
  }

  const toponymeChanges = await validPayload(payload, updateSchema)

  if (toponymeChanges.nomAlt) {
    toponymeChanges.nomAlt = nomAltSchema.getNomAltDefault(toponymeChanges.nomAlt)
  }

  mongo.decorateModification(toponymeChanges)
  const {value} = await mongo.db.collection('toponymes').findOneAndUpdate(
    {_id: mongo.parseObjectID(id), _deleted: null},
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
      toponyme.nomAlt = nomAltSchema.getNomAltDefault(t.nomAlt)

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

async function fetchAll(idBal) {
  return mongo.db.collection('toponymes').find({
    _bal: idBal,
    _deleted: null
  }).toArray()
}

async function remove(id) {
  // On supprime d'abord les références à ce toponyme
  const now = new Date()
  await mongo.db.collection('numeros').updateMany(
    {toponyme: id},
    {$set: {
      toponyme: null,
      _updated: now
    }}
  )

  const {value} = await mongo.db.collection('toponymes').findOneAndUpdate(
    {_id: mongo.parseObjectID(id)},
    {$set: {
      _deleted: now,
      _updated: now
    }},
    {returnDocument: 'after'}
  )

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
