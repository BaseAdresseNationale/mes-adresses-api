const got = require('got')
const {keyBy} = require('lodash')

let communesIndex

async function getRemoteFeatures(url) {
  const response = await got(url, {responseType: 'json'})
  return response.body.features
}

async function prepareContoursCommunes() {
  const communesFeatures = await getRemoteFeatures('http://etalab-datasets.geo.data.gouv.fr/contours-administratifs/2022/geojson/communes-100m.geojson')

  communesIndex = keyBy([...communesFeatures], f => f.properties.code)
}

function getContourCommune(codeCommune) {
  return communesIndex[codeCommune]
}

module.exports = {
  prepareContoursCommunes,
  getContourCommune
}
