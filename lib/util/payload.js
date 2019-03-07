const {pick} = require('lodash')

function getFilteredPayload(payload, schema) {
  const acceptableKeys = Object.keys(schema.describe().children)
  return pick(payload, acceptableKeys)
}

module.exports = {getFilteredPayload}
