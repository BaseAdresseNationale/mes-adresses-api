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
  set(key, value, expiryTime) {
    const expiresAt = (Date.now() + (expiryTime * 1000))
    return cache.set(key, {value, expiresAt})
  },
  get(key) {
    return cache.get(key).value
  }
}
