
const {promisify} = require('util')
const zlib = require('zlib')
const vtpbf = require('vt-pbf')
const geojsonVt = require('geojson-vt')
const {mapValues, pickBy} = require('lodash')

const {useCache} = require('./cache')

const gzip = promisify(zlib.gzip)

async function servePbf(req, res) {
  const {featureCollection, z, x, y} = req
  const layersTiles = mapValues(featureCollection, features => {
    if (!features || features.length === 0) {
      return
    }

    const tileIndex = useCache('tile-index', 300, () => geojsonVt(featureCollection, {maxZoom: z, indexMaxZoom: z}))

    return tileIndex.getTile(z, x, y)
  })

  const pbf = vtpbf.fromGeojsonVt(pickBy(layersTiles))

  res.set({
    'Content-Type': 'application/x-protobuf',
    'Content-Encoding': 'gzip'
  })

  res.send(await gzip(Buffer.from(pbf)))
}

module.exports = servePbf
