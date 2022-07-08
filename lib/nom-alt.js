const mongo = require('./util/mongo')

async function addNomAlt(collectionName, id, nomAlt) {
  const existingNomAlt = await mongo.db.collection(collectionName).findOne({
    _id: mongo.parseObjectID(id),
    nomAlt: {$ne: null},
  }, {projection: {nomAlt: 1}})

  if (nomAlt) {
    if (existingNomAlt) {
      nomAlt = {...existingNomAlt.nomAlt, ...nomAlt}
      return nomAlt && Object.keys(nomAlt).length > 0 ? nomAlt : null
    }

    return nomAlt
  }

  return existingNomAlt?.nomAlt || null
}

module.exports = {addNomAlt}
