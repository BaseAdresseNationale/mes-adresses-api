const {getLabel, readValue} = require('@etalab/bal')

async function validateurBAL(value, label) {
  const {parsedValue, errors} = await readValue(label, value)

  return {
    value: parsedValue,
    errors: errors.map(error => getLabel(`${label}.${error}`))
  }
}

module.exports = {
  validateurBAL
}
