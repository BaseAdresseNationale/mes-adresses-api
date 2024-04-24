const {pick, assign} = require('lodash')

class ValidationError extends Error {
  constructor(validationDetails) {
    super('Invalid payload')
    this.validation = validationDetails
  }
}

function addError(errors, name, label) {
  if (errors[name]) {
    return errors[name].push(label)
  }

  errors[name] = [label]
  return errors
}

function isValidValueType(value, type) {
  if (Array.isArray(value)) {
    return type === 'array'
  }

  return typeof value === type
}

function getFilteredPayload(payload, schema) {
  const acceptableKeys = Object.keys(schema)
  return pick(payload, acceptableKeys)
}

async function validSchema(payload, schema) {
  const value = {}
  const error = {}

  const filteredPayload = pick(payload, Object.keys(schema))

  await Promise.all(Object.keys(schema).map(async key => {
    let parsedValue = null
    if (schema[key].isRequired && filteredPayload[key] === undefined) {
      addError(error, key, `Le champ ${key} est obligatoire`)
    } else if (!schema[key].nullAllowed && filteredPayload[key] === null) {
      addError(error, key, `Le champ ${key} ne peut pas être nul`)
    } else if (filteredPayload[key] && !isValidValueType(filteredPayload[key], schema[key].type)) {
      addError(error, key, `Le champ ${key} doit être de type "${schema[key].type}"`)
    } else if (filteredPayload[key] !== undefined) {
      if (filteredPayload[key] !== null && schema[key].valid) {
        parsedValue = await schema[key].valid(filteredPayload[key], error)
      }

      assign(value, {[key]: parsedValue || filteredPayload[key]})
    }
  }))

  return {value, error}
}

async function validPayload(payload, schema) {
  const {error, value} = await validSchema(payload, schema)

  if (Object.keys(error).length > 0) {
    throw new ValidationError(error)
  }

  return value
}

module.exports = {
  addError,
  validSchema,
  getFilteredPayload,
  validPayload,
  ValidationError
}
