const {MongoClient, ObjectId} = require('mongodb')
const {globalCache} = require('./cache')

const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://localhost:27017'
const MONGODB_DBNAME = process.env.MONGODB_DBNAME || 'api-bal'

class Mongo {
  async connect(connectionString) {
    this.client = new MongoClient(connectionString || MONGODB_URL)
    await this.client.connect()

    this.db = this.client.db(MONGODB_DBNAME)
    this.dbName = MONGODB_DBNAME

    await this.createIndexes()
  }

  async createIndexes() {
    await this.db.collection('bases_locales').createIndex({'sync.status': 1}, {sparse: 1})
    await this.db.collection('bases_locales').createIndex({_updated: 1})
    await this.db.collection('bases_locales').createIndex({_deleted: 1})
    await this.db.collection('bases_locales').createIndex({status: 1})
    await this.db.collection('bases_locales').createIndex({commune: 1})
    await this.db.collection('bases_locales').createIndex({emails: 1})

    await this.db.collection('voies').createIndex({_bal: 1})
    await this.db.collection('voies').createIndex({_bal: 1, commune: 1})
    await this.db.collection('voies').createIndex({_deleted: 1})

    await this.db.collection('toponymes').createIndex({_bal: 1})
    await this.db.collection('toponymes').createIndex({_bal: 1, commune: 1})
    await this.db.collection('toponymes').createIndex({_deleted: 1})

    await this.db.collection('numeros').createIndex({_bal: 1})
    await this.db.collection('numeros').createIndex({_bal: 1, commune: 1})
    await this.db.collection('numeros').createIndex({voie: 1})
    await this.db.collection('numeros').createIndex({toponyme: 1})
    await this.db.collection('numeros').createIndex({_deleted: 1})
  }

  disconnect(force) {
    const {client} = this
    this.client = undefined
    this.db = undefined
    return client.close(force)
  }

  parseObjectID(string) {
    try {
      return new ObjectId(string)
    } catch {
      return null
    }
  }

  decorateCreation(obj, addDeleted = false) {
    const now = new Date()
    obj._created = now
    obj._updated = now

    // Add _deleted property
    if (addDeleted) {
      obj._deleted = null
    }
  }

  decorateModification(obj) {
    obj._updated = new Date()
  }

  async touchDocument(collectionName, id, date = new Date()) {
    await this.db.collection(collectionName).updateOne(
      {_id: this.parseObjectID(id)},
      {$set: {_updated: date}}
    )
    if (collectionName === 'bases_locales') {
      globalCache.del('tile-geojson-vt-' + id)
    }
  }

  async touchDocumentWithManyIds(collectionName, objectIds, date = new Date()) {
    await this.db.collection(collectionName).updateMany(
      {_id: {$in: objectIds}},
      {$set: {_updated: date}}
    )
  }
}

module.exports = new Mongo()
module.exports.ObjectId = ObjectId
