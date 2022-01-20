const cache = new Map()

module.exports = {
  has(key) {
    if (cache.has(key)) {
      const now = Date.now()
      const {expiresAt} = cache.get(key)
      return now < expiresAt
    }

    return false
  },
  set(key, value, ttl) {
    const expiresAt = (Date.now() + (ttl * 1000))
    return cache.set(key, {value, expiresAt})
  },
  get(key) {
    if (cache.has(key)) {
      return cache.get(key).value
    }
  }
}
