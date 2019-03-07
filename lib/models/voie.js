const Joi = require('joi')
const position = require('./position')

const createSchema = Joi.object().keys({
  nom: Joi.string().required(),
  code: Joi.string().regex(/^[0-9A-Z]\d{3}$/).required(),
  positions: Joi.array().items(
    Joi.lazy(() => position.createSchema).description('position schema')
  )
})

const updateSchema = Joi.object().keys({
  nom: Joi.string(),
  code: Joi.string().regex(/^[0-9A-Z]\d{3}$/),
  positions: Joi.array().items(
    Joi.lazy(() => position.createSchema).description('position schema')
  )
})

module.exports = {
  createSchema,
  updateSchema
}
