const mongo = require('../util/mongo')

async function getTasksCache(name) {
  const cache = await mongo.db.collection('_tasks-cache').findOne({name})

  return cache?.value
}

function setTasksCache(name, value) {
  return mongo.db.collection('_tasks-cache').updateOne(
    {name},
    {$set: {value}},
    {upsert: true}
  )
}

module.exports = {getTasksCache, setTasksCache}
