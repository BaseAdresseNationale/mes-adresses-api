const Joi = require('joi')

const createSchema = Joi.object().keys({
  nom: Joi.string().max(200).required(),
  description: Joi.string().max(2000).required(),
  emails: Joi.array().min(1).items(
    Joi.string().email().required()
  )
})

const updateSchema = createSchema

module.exports = {
  createSchema,
  updateSchema
}
