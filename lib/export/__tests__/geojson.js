const test = require('ava')
const randomColor = require('randomcolor')
const {voiesLineStringsToGeoJSON, voiesPointsToGeoJSON, numerosPointsToGeoJSON} = require('../geojson')
const mongo = require('../../util/mongo')

test('voiesLineStringsToGeoJSON', t => {
  const trace = {
    type: 'LineString',
    coordinates: [[-122.09, 37.42], [-122.08, 37.43]]
  }
  const voies = [
    {
      _id: new mongo.ObjectId(),
      nom: 'voie1',
      trace,
      typeNumerotation: 'metrique'
    },
  ]
  const nb = Number.parseInt(voies[0]._id.toHexString().slice(19), 16)
  const seed = Math.floor((Math.abs(Math.sin(nb) * 16777215)))
  const color = randomColor({
    luminosity: 'dark',
    seed,
  })
  const funcRes = voiesLineStringsToGeoJSON(voies)
  const expectedRes = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: trace,
        properties: {
          id: voies[0]._id.toHexString(),
          type: 'voie-trace',
          nom: voies[0].nom,
          color,
          originalGeometry: trace
        }
      }
    ]
  }
  t.deepEqual(funcRes, expectedRes)
})

test('voiesPointsToGeoJSON', t => {
  const trace = {
    type: 'LineString',
    coordinates: [[-122.09, 37.42], [-122.08, 37.43]]
  }

  const voies = [
    {
      _id: new mongo.ObjectId(),
      nom: 'voie1',
      trace,
      typeNumerotation: 'metrique',
      centroid: {geometry: [0, 0]}
    },
    {
      _id: new mongo.ObjectId(),
      nom: 'voie2',
      centroid: {geometry: [1, 1]}
    }
  ]

  const nb = Number.parseInt(voies[0]._id.toHexString().slice(19), 16)
  const seed = Math.floor((Math.abs(Math.sin(nb) * 16777215)))
  const color = randomColor({
    luminosity: 'dark',
    seed,
  })

  const nb2 = Number.parseInt(voies[1]._id.toHexString().slice(19), 16)
  const seed2 = Math.floor((Math.abs(Math.sin(nb2) * 16777215)))
  const color2 = randomColor({
    luminosity: 'dark',
    seed: seed2,
  })

  const funcRes = voiesPointsToGeoJSON(voies)
  const expectedRes = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: [0, 0],
        properties: {
          id: voies[0]._id.toHexString(),
          type: 'voie',
          nom: voies[0].nom,
          color,
        }
      },
      {
        type: 'Feature',
        geometry: [1, 1],
        properties: {
          id: voies[1]._id.toHexString(),
          type: 'voie',
          nom: voies[1].nom,
          color: color2,
        }
      }
    ]
  }
  t.deepEqual(funcRes, expectedRes)
})

test('numerosPointsToGeoJSON', t => {
  const voie1 = new mongo.ObjectId()
  const voie2 = new mongo.ObjectId()
  const toponyme1 = new mongo.ObjectId()

  const numeros = [
    {
      _id: new mongo.ObjectId(),
      voie: voie1,
      numero: 1,
      suffixe: 'ter',
      toponyme: toponyme1,
      positions: [{
        type: 'entrée',
        point: {
          type: 'Point',
          coordinates: [1, 1]
        }
      }],
      parcelles: ['1', '2', '3'],
      certifie: true,
    },
    {
      _id: new mongo.ObjectId(),
      voie: voie2,
      numero: 2,
      suffixe: 'bis',
      positions: [{
        type: 'entrée',
        point: {
          type: 'Point',
          coordinates: [2, 2]
        }
      }],
    },
  ]
  const nb1 = Number.parseInt(voie1.toHexString().slice(19), 16)
  const seed1 = Math.floor((Math.abs(Math.sin(nb1) * 16777215)))
  const color1 = randomColor({
    luminosity: 'dark',
    seed: seed1,
  })

  const nb2 = Number.parseInt(voie2.toHexString().slice(19), 16)
  const seed2 = Math.floor((Math.abs(Math.sin(nb2) * 16777215)))
  const color2 = randomColor({
    luminosity: 'dark',
    seed: seed2,
  })

  const funcRes = numerosPointsToGeoJSON(numeros)
  const expectedRes = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: numeros[0].positions[0].point,
        properties: {
          type: 'adresse',
          id: numeros[0]._id.toHexString(),
          idVoie: voie1.toHexString(),
          idToponyme: toponyme1.toHexString(),
          numero: numeros[0].numero,
          suffixe: numeros[0].suffixe,
          typePosition: 'entrée',
          parcelles: numeros[0].parcelles,
          certifie: numeros[0].certifie,
          color: color1,
        }
      },
      {
        type: 'Feature',
        geometry: numeros[1].positions[0].point,
        properties: {
          type: 'adresse',
          id: numeros[1]._id.toHexString(),
          idVoie: voie2.toHexString(),
          idToponyme: null,
          numero: numeros[1].numero,
          suffixe: numeros[1].suffixe,
          typePosition: 'entrée',
          parcelles: numeros[1].parcelles,
          certifie: numeros[1].certifie,
          color: color2,
        }
      },
    ]
  }
  t.deepEqual(funcRes, expectedRes)
})
