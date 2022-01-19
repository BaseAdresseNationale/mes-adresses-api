const cache = new Map()

module.exports = {
  has(key) {
    return cache.has(key)
  },
  set(key, value) {
    return cache.set(key, [Date.now(), value])
  },
  get(key) {
    return cache.get(key)
  },
  isExpired(key, minute) {
    const [timestamp] = cache.get(key)
    return (Date.now() - timestamp) / 1000 > 60 * minute
  }
}
