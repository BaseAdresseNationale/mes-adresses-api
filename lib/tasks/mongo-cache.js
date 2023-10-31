const mongo = require('../util/mongo')

async function getMongoCache(name) {
  const cache = await mongo.db.collection('_mongo-cache').findOne({name})

  return cache?.value
}

function setMongoCache(name, value) {
  return mongo.db.collection('_mongo-cache').updateOne(
    {name},
    {$set: {value}},
    {upsert: true}
  )
}

module.exports = {getMongoCache, setMongoCache}
