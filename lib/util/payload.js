const Joi = require('joi')
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
  const acceptableKeys = Object.keys(schema.describe().children)
  return pick(payload, acceptableKeys)
}

function validPayload(payload, schema) {
  const filteredPayload = getFilteredPayload(payload, schema)

  const {error} = Joi.validate(filteredPayload, schema, {abortEarly: false})

  if (error) {
    throw new ValidationError(error.details)
  }

  return filteredPayload
}

module.exports = {
  getFilteredPayload,
  validPayload,
  ValidationError
}
