const internalCache = new Map()

function has(key) {
  if (internalCache.has(key)) {
    const now = Date.now()
    const {expiresAt} = internalCache.get(key)
    return now < expiresAt
  }

  return false
}

function get(key) {
  if (has(key)) {
    const cacheEntry = internalCache.get(key)

    if (!cacheEntry) {
      throw new Error('Unexpected behavior: cache entry not available anymore')
    }

    return cacheEntry.value
  }
}

function set(key, value, ttl) {
  const expiresAt = (Date.now() + (ttl * 1000))
  return internalCache.set(key, {value, expiresAt})
}

module.exports = {has, get, set}
