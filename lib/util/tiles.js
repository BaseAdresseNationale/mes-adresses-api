const turf = require('@turf/turf')
const {range, union} = require('lodash')
const {pointToTile, bboxToTile, getParent, getChildren, tileToBBOX} = require('@mapbox/tilebelt')
const mongo = require('../util/mongo')
const {getPriorityPosition} = require('../export/geojson')

const ZOOM = {
  NUMEROS_ZOOM: {
    minZoom: 13,
    maxZoom: 19
  },
  VOIE_ZOOM: {
    minZoom: 13,
    maxZoom: 19
  },
  TRACE_DISPLAY_ZOOM: {
    minZoom: 13,
    maxZoom: 19
  },
  TRACE_MONGO_ZOOM: {
    zoom: 13,
  }
}

async function updateVoiesTile(voieIds) {
  const voies = await mongo.db.collection('voies')
    .find({_id: {$in: voieIds.map(id => mongo.parseObjectID(id))}, _deleted: null})
    .project({_id: 1, typeNumerotation: 1, trace: 1})
    .toArray()
  return Promise.all(voies.map(v => updateVoieTile(v)))
}

async function updateVoieTile(voie) {
  const _id = mongo.parseObjectID(voie._id)
  const voieSet = await calcMetaTilesVoie(voie)
  return mongo.db.collection('voies').updateOne({_id}, {$set: voieSet})
}

function roundCoordinate(coordinate, precision = 6) {
  return Number.parseFloat(coordinate.toFixed(precision))
}

function calcMetaTilesNumero(numero) {
  numero.tiles = null
  try {
    if (numero.positions && numero.positions.length > 0) {
      const position = getPriorityPosition(numero.positions)
      numero.tiles = getTilesByPosition(position.point, ZOOM.NUMEROS_ZOOM)
    }
  } catch (error) {
    console.error(error, numero)
  }

  return numero
}

async function calcMetaTilesVoie(voie) {
  voie.centroid = null
  voie.centroidTiles = null
  voie.traceTiles = null

  try {
    if (voie.typeNumerotation === 'metrique' && voie.trace) {
      voie.centroid = turf.centroid(voie.trace)
      voie.centroidTiles = getTilesByPosition(voie.centroid.geometry, ZOOM.VOIE_ZOOM)
      voie.traceTiles = getTilesByLineString(voie.trace)
    } else {
      const numeros = await mongo.db.collection('numeros')
        .find({voie: voie._id, _deleted: null})
        .project({positions: 1, voie: 1})
        .toArray()
      if (numeros.length > 0) {
        const coordinatesNumeros = numeros
          .filter(n => n.positions && n.positions.length > 0)
          .map(n => getPriorityPosition(n.positions)?.point?.coordinates)
        // CALC CENTROID
        if (coordinatesNumeros.length > 0) {
          const featureCollection = turf.featureCollection(coordinatesNumeros.map(n => turf.point(n)))
          voie.centroid = turf.centroid(featureCollection)
          voie.centroidTiles = getTilesByPosition(voie.centroid.geometry, ZOOM.VOIE_ZOOM)
        }
      }
    }
  } catch (error) {
    console.error(error, voie)
  }

  return voie
}

function getParentTile(tile, zoomFind) {
  return tile[2] <= zoomFind ? tile : getParentTile(getParent(tile), zoomFind)
}

function getTilesByPosition(position, {minZoom, maxZoom} = ZOOM.NUMEROS_ZOOM) {
  if (!position || (!minZoom || !maxZoom)) {
    return null
  }

  const lon = roundCoordinate(position.coordinates[0], 6)
  const lat = roundCoordinate(position.coordinates[1], 6)

  const tiles = range(minZoom, maxZoom + 1).map(zoom => {
    const [x, y, z] = pointToTile(lon, lat, zoom)
    return `${z}/${x}/${y}`
  })

  return tiles
}

function getTilesByLineString(lineString, {zoom} = ZOOM.TRACE_MONGO_ZOOM) {
  const bboxFeature = turf.bbox(lineString)
  const [x, y, z] = bboxToTile(bboxFeature)
  const tiles = getTilesByBbox([x, y, z], lineString, zoom)
  return tiles
}

function getTilesByBbox([x, y, z], geojson, zoom) {
  const tiles = []
  if (z === zoom) {
    return [`${z}/${x}/${y}`]
  }

  if (z < zoom) {
    const childTiles = getChildren([x, y, z])
    for (const childTile of childTiles) {
      const childTileBbox = tileToBBOX(childTile)
      const bboxPolygon = turf.bboxPolygon(childTileBbox)
      if (turf.booleanIntersects(geojson, bboxPolygon)) {
        tiles.push(...getTilesByBbox(childTile, geojson, zoom))
      }
    }
  } else {
    const parentTile = getParent([x, y, z])
    tiles.push(...getTilesByBbox(parentTile, geojson, zoom))
  }

  return union(tiles)
}

module.exports = {
  calcMetaTilesVoie,
  calcMetaTilesNumero,
  getParentTile,
  updateVoieTile,
  updateVoiesTile,
  ZOOM,
}
