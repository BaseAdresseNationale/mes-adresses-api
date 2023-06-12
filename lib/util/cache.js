const {createClient} = require('redis')

class Cache {
  constructor() {
    this.client = createClient()
    this.client.on('error', err => console.log('Redis Client Error', err))
    this.client.connect()
  }

  async del(key) {
    try {
      return await this.client.del(key)
    } catch (error) {
      console.error('REDIS DEL :', error)
    }
  }

  async get(key) {
    try {
      const res = await this.client.get(key)
      return JSON.parse(res)
    } catch (error) {
      console.error('REDIS GET :', error)
    }
  }

  async set(key, value, ttl) {
    try {
      return await this.client.set(key, JSON.stringify(value), {EX: ttl})
    } catch (error) {
      console.error('REDIS GET :', error)
    }
  }
}

const globalCache = new Cache()

async function useCache(key, ttl, resolver) {
  const res = await globalCache.get(key)
  if (!res) {
    const value = await resolver()
    await globalCache.set(key, value, ttl)
    return value
  }

  return res
}

module.exports = {globalCache, useCache}
