const mongo = require('../util/mongo')

async function expandModelWithNumeros(model, idProperty) {
  const nbNumeros = await mongo.db.collection('numeros').countDocuments({[idProperty]: mongo.parseObjectID(model._id)})
  const nbNumerosCertifies = await mongo.db.collection('numeros').countDocuments({[idProperty]: mongo.parseObjectID(model._id), certifie: true})
  const isAllCertified = nbNumeros > 0 && nbNumeros === nbNumerosCertifies
  const commentedNumeros = await mongo.db.collection('numeros').find({
    [idProperty]: mongo.parseObjectID(model._id),
    comment: {$ne: null}})
    .project({numero: 1, suffixe: 1, comment: 1}).toArray()

  model.nbNumeros = nbNumeros
  model.nbNumerosCertifies = nbNumerosCertifies
  model.isAllCertified = isAllCertified
  model.commentedNumeros = commentedNumeros

  return model
}

module.exports = {expandModelWithNumeros}
