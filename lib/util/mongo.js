const {MongoClient, ObjectID} = require('mongodb')
const indexes = require('../../mongo.indexes')

class Mongo {
  async connect(connectionString) {
    this.client = await MongoClient.connect(connectionString || process.env.MONGODB_URL || 'mongodb://localhost:27017', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      reconnectTries: 1
    })
    this.db = this.client.db(process.env.MONGODB_DBNAME || 'api-bal')
  }

  async ensureIndexes() {
    await Promise.all(Object.keys(indexes).map(collectionName => {
      const collectionIndexes = indexes[collectionName]
      return Promise.all(collectionIndexes.map(collectionIndex => {
        return this.db.collection(collectionName).createIndex(collectionIndex)
      }))
    }))
  }

  disconnect(force) {
    if (this.client && this.client.isConnected()) {
      return this.client.close(force)
    }
  }

  parseObjectID(string) {
    try {
      return new ObjectID(string)
    } catch (error) {
      return null
    }
  }

  decorateCreation(obj) {
    const now = new Date()
    obj._created = now
    obj._updated = now
  }

  decorateModification(obj) {
    obj._updated = new Date()
  }

  async touchDocument(collectionName, id, date = new Date()) {
    await this.db.collection(collectionName).updateOne(
      {_id: this.parseObjectID(id)},
      {$set: {_updated: date}}
    )
  }
}

module.exports = new Mongo()
module.exports.ObjectID = ObjectID
