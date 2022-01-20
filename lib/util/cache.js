const cache = new Map()

module.exports = {
  has(key) {
    if (cache.has(key)) {
      const now = Date.now()
      const expiresAt = cache.get(key)[2]
      return now < expiresAt
    }

    return false
  },
  set(key, value, expiryTime) {
    const now = Date.now()
    const expiresAt = (now + (expiryTime * 1000))
    return cache.set(key, [value, now, expiresAt])
  },
  get(key) {
    return cache.get(key)[0]
  }
}
