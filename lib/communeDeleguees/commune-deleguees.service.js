const {getCommuneByChefLieu} = require('../util/cog')
const mongo = require('../util/mongo')

async function updateCommuneDeleguees() {
  const bals = await mongo.db.collection('bases_locales').find({}).toArray()
  const updatedPromises = []
  for (const bal of bals) {
    const communesDeleguees = getCommuneByChefLieu(bal.commune)?.map(cd => cd.code) || null
    if (communesDeleguees) {
      const promise = mongo.db.collection('bases_locales').updateOne({
        _id: bal._id
      }, {$set: {
        communesDeleguees,
      }})

      updatedPromises.push(promise)
    }
  }

  await Promise.all(updatedPromises)
}

module.exports = {updateCommuneDeleguees}
