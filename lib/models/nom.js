const mongo = require('../util/mongo')
const {ValidationError} = require('../util/payload')
const {diacriticSensitiveRegex} = require('../util/string')

async function nomAlreadyExistInCollection(collection, nom, balId) {
  const res = await mongo.db.collection(collection).countDocuments({
    nom: {
      $regex : '^' + diacriticSensitiveRegex(nom) + '$',
      $options : 'i'
    },
    _bal: mongo.ObjectId(balId)
  })
  return res;
}

async function checkTextAlreadyExistInNomVoieOrNomToponyme(text, balId) {
  if (await nomAlreadyExistInCollection('voies', text, balId) > 0) {
    throw new ValidationError({nom: ["Une voie porte déjà ce nom dans la Bal"]})
  }
  if (await nomAlreadyExistInCollection('toponymes', text, balId) > 0) {
    throw new ValidationError({nom: ["Un toponyme porte déjà ce nom dans la Bal"]})
  }
  return ;
}

module.exports = {
  checkTextAlreadyExistInNomVoieOrNomToponyme
}


