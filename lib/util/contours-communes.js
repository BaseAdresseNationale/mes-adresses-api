const {writeFile} = require('node:fs/promises')
const path = require('node:path')
const got = require('got')
const {keyBy} = require('lodash')

let communesIndex

async function getRemoteFeatures(url) {
  const response = await got(url, {responseType: 'json'})
  return response.body.features
}

async function createContoursCommunesJson() {
  const url = process.env.URL_CONTOURS_COMMUNES || 'http://etalab-datasets.geo.data.gouv.fr/contours-administratifs/2023/geojson/communes-100m.geojson'
  const communesFeatures = await getRemoteFeatures(url)
  await writeFile(path.join(__dirname, '../..', 'contours-communes.json'), JSON.stringify(communesFeatures, null, 2))
  console.log('contours-communes.json updated successfully !')
  return communesFeatures
}

async function prepareContoursCommunes() {
  let contoursCommunes
  try {
    contoursCommunes = require('../../contours-communes.json')
  } catch {
    console.log('Fetch Contours Communes...')
    contoursCommunes = await createContoursCommunesJson()
  } finally {
    communesIndex = keyBy([...contoursCommunes], f => f.properties.code)
  }
}

function getContourCommune(codeCommune) {
  return communesIndex[codeCommune]
}

module.exports = {
  createContoursCommunesJson,
  prepareContoursCommunes,
  getContourCommune
}
