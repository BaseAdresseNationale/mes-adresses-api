const languesRegionales = require('@ban-team/shared-data/langues-regionales.json')
const {addError} = require('../util/payload')
const {validateurBAL} = require('../validateur-bal')

const supportedNomAlt = new Set(languesRegionales.map(l => l.code))

async function validNomAlt(nomAlt, error) {
  Object.keys(nomAlt).forEach(async codeISO => {
    if (supportedNomAlt.has(codeISO)) {
      const nomVoie = nomAlt[codeISO]
      const {errors} = await validateurBAL(nomVoie, 'voie_nom')

      errors.forEach(err => {
        addError(error, 'nomAlt', `${codeISO} : ${err}`)
      })
    } else {
      addError(error, 'nomAlt', `Le code langue régionale ${codeISO} n’est pas supporté`)
    }
  })
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
