const {addError} = require('../util/payload')
const {validateurBAL} = require('../validateur-bal')

async function validPoint(point, error) {
  if (point.type && point.coordinates) {
    if (point.type !== 'Point') {
      addError(error, 'point', 'Le champ point.type doit avoir pour valeur "Point"')
    }

    if (Array.isArray(point.coordinates) && point.coordinates.length === 2) {
      const [lat, long] = point.coordinates

      if (typeof lat !== 'number' || typeof long !== 'number') {
        addError(error, 'positions', 'le champ point.coordinates est incorrecte')
        return
      }

      const latResults = await validateurBAL(lat.toString(), 'lat')

      latResults.errors.forEach(err => {
        addError(error, 'positions', err)
      })

      const longResults = await validateurBAL(long.toString(), 'long')
      longResults.errors.forEach(err => {
        addError(error, 'positions', err)
      })
    } else {
      addError(error, 'positions', 'le champ point.coordinates est incorrecte')
    }
  } else {
    addError(error, 'positions', 'Le champ point est invalide')
  }
}

async function validSource(source, error) {
  const {errors} = await validateurBAL(source, 'source')
  errors.forEach(err => {
    addError(error, 'positions', err)
  })
}

async function validPositionType(type, error) {
  const {errors} = await validateurBAL(type, 'position')
  errors.forEach(err => {
    addError(error, 'positions', err)
  })
}

const createSchema = {
  point: {valid: validPoint, isRequired: true, nullAllowed: false, type: 'object'},
  source: {valid: validSource, isRequired: false, nullAllowed: true, type: 'string'},
  type: {valid: validPositionType, isRequired: true, nullAllowed: false, type: 'string'}
}

const updateSchema = createSchema

module.exports = {
  createSchema,
  updateSchema
}
