const {MongoClient, ObjectID} = require('mongodb')

class Mongo {
  async connect(connectionString) {
    this.client = await MongoClient.connect(connectionString || process.env.MONGO_URL || 'mongodb://localhost:27017', {
      useNewUrlParser: true,
      reconnectTries: 1
    })
    this.db = this.client.db(process.env.MONGODB_URL || 'api-bal')
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
}

module.exports = new Mongo()
module.exports.ObjectID = ObjectID
