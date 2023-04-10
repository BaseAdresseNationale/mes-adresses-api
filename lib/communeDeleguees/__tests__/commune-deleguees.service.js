const test = require('ava')
const {MongoMemoryServer} = require('mongodb-memory-server')
const mongo = require('../../util/mongo')
const CommuneDelegueeService = require('../commune-deleguees.service')

let mongod

test.before('start server', async () => {
  mongod = await MongoMemoryServer.create()
  await mongo.connect(mongod.getUri())
})

test.after.always('cleanup', async () => {
  await mongo.disconnect()
  await mongod.stop()
})

test.serial('updateCommuneDeleguees without communesDeleguees', async t => {
  const _id = new mongo.ObjectId()
  await mongo.db.collection('bases_locales').insertOne({
    _id,
    commune: '000000'
  })

  await CommuneDelegueeService.updateCommuneDeleguees()

  const res = await mongo.db.collection('bases_locales').findOne({_id})
  t.deepEqual({
    _id,
    commune: '000000',
  }, res)
})

test.serial('updateCommuneDeleguees with communesDeleguees', async t => {
  const _id = new mongo.ObjectId()
  const codeChefLieu = require('@etalab/decoupage-administratif/data/communes.json')
    .find(c => c.chefLieu).chefLieu
  const communesDeleguees = require('@etalab/decoupage-administratif/data/communes.json')
    .filter(c => c.chefLieu === codeChefLieu)

  await mongo.db.collection('bases_locales').insertOne({
    _id,
    commune: codeChefLieu
  })
  await CommuneDelegueeService.updateCommuneDeleguees()
  const res = await mongo.db.collection('bases_locales').findOne({_id})
  t.deepEqual({
    _id,
    commune: codeChefLieu,
    communesDeleguees: communesDeleguees.map(c => c.code)
  }, res)
})
