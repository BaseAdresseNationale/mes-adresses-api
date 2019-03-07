const Joi = require('joi')

const createSchema = Joi.object().keys({
  nom: Joi.string().max(200),
  description: Joi.string().max(2000),
  emails: Joi.array().min(1).items(
    Joi.string().email().required()
  )
})

const updateSchema = createSchema

module.exports = {
  createSchema,
  updateSchema
}
