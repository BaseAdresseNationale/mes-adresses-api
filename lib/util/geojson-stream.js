const {Transform} = require('stream')

const GEOJSON_BEGIN = '{"type":"FeatureCollection","features":[\n'
const GEOJSON_END = '\n]}\n'
const GEOJSON_SEP = '\n,'
const GEOJSON_EMPTY = '{"type":"FeatureCollection","features":[]}\n'

function stringify() {
  let started = false

  return new Transform({
    writableObjectMode: true,

    transform(feature, encoding, callback) {
      if (started) {
        this.push(GEOJSON_SEP + JSON.stringify(feature))
      } else {
        this.push(GEOJSON_BEGIN + JSON.stringify(feature))
        started = true
      }

      callback()
    },

    flush(callback) {
      if (started) {
        this.push(GEOJSON_END)
      } else {
        this.push(GEOJSON_EMPTY)
      }

      callback()
    }
  })
}

module.exports = {stringify}
