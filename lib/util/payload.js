const {pick, assign, difference} = require('lodash')

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

  difference(Object.keys(payload), Object.keys(schema)).forEach(key => {
    addError(error, key, `Le champ ${key} n’est pas autorisé`)
  })

  await Promise.all(Object.keys(schema).map(async key => {
    if (schema[key].isRequired && payload[key] === undefined) {
      addError(error, key, `Le champ ${key} est obligatoire`)
    } else if (!schema[key].nullAllowed && payload[key] === null) {
      addError(error, key, `Le champ ${key} ne peut pas être nul`)
    } else if (payload[key] && !isValidValueType(payload[key], schema[key].type)) {
      addError(error, key, `Le champ ${key} doit être de type "${schema[key].type}"`)
    } else if (payload[key] !== undefined) {
      if (payload[key] !== null && schema[key].valid) {
        await schema[key].valid(payload[key], error)
      }

      assign(value, {[key]: payload[key]})
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
