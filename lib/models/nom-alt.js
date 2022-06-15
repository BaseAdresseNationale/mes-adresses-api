const languesRegionales = require('@ban-team/shared-data/langues-regionales.json')
const {assign} = require('lodash')
const {addError} = require('../util/payload')
const {validateurBAL} = require('../validateur-bal')

const allowedNomAlt = languesRegionales.map(l => l.code)

function validNomAlt(nomAlt, error) {
  if (nomAlt) {
    if (Object.keys(nomAlt).length > allowedNomAlt.length) {
      addError(error, 'nomAlt', `Trop de noms alternatifs (${allowedNomAlt.length} maximum)`)
    }

    const disallowedNomAlt = Object.keys(nomAlt).filter(nom => !allowedNomAlt.includes(nom))

    if (disallowedNomAlt.length > 0) {
      const allowedList = new Intl.ListFormat('fr', {type: 'disjunction'}).format(allowedNomAlt)
      const disallowedList = new Intl.ListFormat('fr').format(disallowedNomAlt)

      addError(error, 'nomAlt', `Valeurs "nomAlt" inattendues : ${disallowedList}. Valeurs attendues : ${allowedList}`)
    }

    const parsedValue = {}
    Object.keys(nomAlt).forEach(async nom => {
      const result = await validateurBAL(nom, 'voie_nom')
      if (result.value) {
        parsedValue[nom] = result.value
      }

      assign(error, result.error)
    })

    return Object.keys(parsedValue).length === Object.keys(nomAlt).length ? parsedValue : nomAlt
  }
}

function getNomAltDefault(nomAlt) {
  return nomAlt && Object.keys(nomAlt).length > 0 ? nomAlt : null
}

function cleanNomAlt(nomAlt) {
  Object.keys(nomAlt).forEach(nom => {
    nomAlt[nom] = nomAlt[nom].replace(/^\s+/g, '').replace(/\s+$/g, '').replace(/\s\s+/g, ' ')
  })

  return nomAlt
}

const createSchema = {valid: validNomAlt, isRequired: false, nullAllowed: true, type: 'object'}
const updateSchema = createSchema

module.exports = {
  createSchema,
  updateSchema,
  getNomAltDefault,
  cleanNomAlt
}
