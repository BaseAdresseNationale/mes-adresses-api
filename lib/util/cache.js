class Cache {
  constructor() {
    this.internalCache = new Map()

    setInterval(() => {
      const now = Date.now()
      this.internalCache.forEach((value, key) => {
        if (value.expiresAt < now) {
          this.internalCache.delete(key)
        }
      })
    }, 5000)
  }

  delete(key) {
    if (this.has(key)) {
      const cacheEntry = this.internalCache.delete(key)

      if (!cacheEntry) {
        throw new Error('Unexpected behavior: cache entry not available anymore')
      }

      return cacheEntry.value
    }

    return false
  }

  has(key) {
    if (this.internalCache.has(key)) {
      const now = Date.now()
      const {expiresAt} = this.internalCache.get(key)
      return now < expiresAt
    }

    return false
  }

  get(key) {
    if (this.has(key)) {
      const cacheEntry = this.internalCache.get(key)

      if (!cacheEntry) {
        throw new Error('Unexpected behavior: cache entry not available anymore')
      }

      return cacheEntry.value
    }
  }

  set(key, value, ttl) {
    const expiresAt = (Date.now() + (ttl * 1000))
    return this.internalCache.set(key, {value, expiresAt})
  }
}

const globalCache = new Cache()

async function useCache(key, ttl, resolver) {
  if (!globalCache.has(key)) {
    const value = await resolver()
    globalCache.set(key, value, ttl)
    return value
  }

  return globalCache.get(key)
}

module.exports = {globalCache, useCache}
