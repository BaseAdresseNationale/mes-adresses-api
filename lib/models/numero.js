const Joi = require('joi')
const position = require('./position')

const createSchema = Joi.object().keys({
  numero: Joi.number().min(0).max(999).integer().required(),
  suffixe: Joi.string().regex(/^[a-z][a-z0-9]*$/).max(10),
  positions: Joi.array().items(
    Joi.lazy(() => position.createSchema).description('position schema')
  )
})

const updateSchema = createSchema

module.exports = {
  createSchema,
  updateSchema
}
