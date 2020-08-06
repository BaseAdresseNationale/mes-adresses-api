const {pick} = require('lodash')

class ValidationError extends Error {
  constructor(validationDetails) {
    super('Invalid payload')
    this.validation = validationDetails.reduce((acc, detail) => {
      const key = detail.path[0]
      if (!acc[key]) {
        acc[key] = []
      }

      acc[key].push(detail.message)
      return acc
    }, {})
  }
}

function getFilteredPayload(payload, schema) {
  const acceptableKeys = Object.keys(schema.describe().keys)
  return pick(payload, acceptableKeys)
}

function validPayload(payload, schema) {
  const {error, value} = schema.validate(payload, {
    abortEarly: false,
    stripUnknown: true,
    convert: false
  })

  if (error) {
    throw new ValidationError(error.details)
  }

  return value
}

module.exports = {
  getFilteredPayload,
  validPayload,
  ValidationError
}
