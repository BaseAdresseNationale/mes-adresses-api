const vtpbf = require('vt-pbf')
const geojsonVt = require('geojson-vt')
const {mapValues, pickBy} = require('lodash')

async function servePbf(req, res) {
  const {featureCollection, z, x, y} = req
  const layersTiles = mapValues(featureCollection, features => {
    if (!features || features.length === 0) {
      return
    }

    const tileIndex = geojsonVt(featureCollection, {maxZoom: z, indexMaxZoom: z})
    return tileIndex.getTile(z, x, y)
  })

  const pbf = vtpbf.fromGeojsonVt(pickBy(layersTiles))

  res.send(Buffer.from(pbf))
}

module.exports = servePbf
