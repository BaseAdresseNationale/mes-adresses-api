const Joi = require('joi')

const allowedNomAlt = new Set([
  'fra',
  'bre',
  'eus',
  'gsw',
  'cos',
  'gcr',
  'gcf',
  'rcf',
  'swb',
  'oci'
])

function nomAltValidation(nomAlt) {
  if (nomAlt) {
    if (Object.keys(nomAlt).length > allowedNomAlt.size) {
      throw new Error(`Trop de nom (${allowedNomAlt.size} maximum)`)
    }

    const disallowedNomAlt = Object.keys(nomAlt).filter(nom => !allowedNomAlt.has(nom))

    if (disallowedNomAlt.length > 0) {
      const allowedList = new Intl.ListFormat('fr', {type: 'disjunction'}).format([...allowedNomAlt])
      const disallowedList = new Intl.ListFormat('fr').format(disallowedNomAlt)

      throw new Error(`Valeurs "nomAlt" inattendues : ${disallowedList}.\nValeurs attendues : ${allowedList}`)
    }

    Object.keys(nomAlt).forEach(nom => {
      if (nomAlt[nom].trim().length === 0) {
        throw new Error('Ce champ ne peut être vide')
      }

      if (nomAlt[nom].length > 200) {
        throw new Error('Le nom est trop long (200 caractères maximum)')
      }
    })

    return nomAlt
  }
}

function getNomAltDefault(nomAlt) {
  return nomAlt && Object.keys(nomAlt).length > 0 ? nomAlt : null
}

const createSchema = Joi.object().custom(nomAltValidation)
const updateSchema = createSchema

module.exports = {
  createSchema,
  updateSchema,
  getNomAltDefault
}
