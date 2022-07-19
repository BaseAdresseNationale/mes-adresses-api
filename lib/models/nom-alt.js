const Joi = require('joi')

const nomAltValidation = Joi.string()
  .min(1).message('Le nom est trop court (1 caractère minimum)')
  .max(200).message('Le nom est trop long (200 caractères maximum)')

const createSchema = Joi.object().keys({
  fra: nomAltValidation.allow(null),
  bre: nomAltValidation.allow(null),
  eus: nomAltValidation.allow(null),
  asw: nomAltValidation.allow(null),
  cos: nomAltValidation.allow(null),
  gyn: nomAltValidation.allow(null),
  rcf: nomAltValidation.allow(null),
  oci: nomAltValidation.allow(null)
})


function getNomAltDefault(nomAlt) {
  return nomAlt && Object.keys(nomAlt).length > 0 ? nomAlt : null
}
const updateSchema = createSchema

module.exports = {
  createSchema,
  updateSchema,
  getNomAltDefault
}
