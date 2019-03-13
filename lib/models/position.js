const Joi = require('joi')

const createSchema = Joi.object().keys({
  point: Joi.object({
    type: Joi.strict().valid('Point').required(),
    coordinates: Joi.array().items(Joi.number()).min(2).max(2).required()
  }).required(),
  source: Joi.string().required(),
  type: Joi.string().valid(
    'entrée',
    'délivrance postale',
    'bâtiment',
    'cage d’escalier',
    'logement',
    'parcelle',
    'segment',
    'service technique'
  ).required()
})

const updateSchema = createSchema

module.exports = {
  createSchema,
  updateSchema
}
