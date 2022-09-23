const mongo = require('../util/mongo')

async function expandModelWithNumerosCount(model, idProperty) {
  const nbNumeros = await mongo.db.collection('numeros').countDocuments({[idProperty]: mongo.parseObjectID(model._id)})
  const nbNumerosCertifies = await mongo.db.collection('numeros').countDocuments({[idProperty]: mongo.parseObjectID(model._id), certifie: true})
  const isAllCertified = nbNumeros > 0 && nbNumeros === nbNumerosCertifies

  model.nbNumeros = nbNumeros
  model.nbNumerosCertifies = nbNumerosCertifies
  model.isAllCertified = isAllCertified

  return model
}

module.exports = {expandModelWithNumerosCount}
