const test = require('ava')
const randomColor = require('randomcolor')
const {voiesToLineGeoJSON, voiesToPointGeoJSON, numerosToGeoJSON} = require('../geojson')
const mongo = require('../../util/mongo')

test('voiesToLineGeoJSON', t => {
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
    {
      _id: new mongo.ObjectId(),
      nom: 'voie2',
    }
  ]
  const color = randomColor({
    luminosity: 'dark',
    seed: voies[0]._id.toHexString()
  })
  const funcRes = voiesToLineGeoJSON(voies)
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
          idVoie: voies[0]._id.toHexString(),
          color,
          originalGeometry: trace
        }
      }
    ]
  }
  t.deepEqual(funcRes, expectedRes)
})

test('voiesToPointGeoJSON', t => {
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
    {
      _id: new mongo.ObjectId(),
      nom: 'voie2',
    }
  ]

  const numeros = [{
    voie: voies[1]._id,
    positions: [{
      point: {
        type: 'Point',
        coordinates: [2.173911, 48.733106]
      }
    }],
  }]

  const color = randomColor({
    luminosity: 'dark',
    seed: voies[0]._id.toHexString()
  })

  const color2 = randomColor({
    luminosity: 'dark',
    seed: voies[1]._id.toHexString()
  })

  const funcRes = voiesToPointGeoJSON(voies, numeros)
  const expectedRes = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {type: 'Point', coordinates: [-122.08500000000001, 37.425]},
        properties: {
          id: voies[0]._id.toHexString(),
          type: 'voie',
          nomVoie: voies[0].nom,
          nbNumero: 0,
          nbNumeroCertifie: 0,
          idVoie: voies[0]._id.toHexString(),
          color,
        }
      },
      {
        type: 'Feature',
        geometry: numeros[0].positions[0].point,
        properties: {
          id: voies[1]._id.toHexString(),
          type: 'voie',
          nbNumero: 1,
          nbNumeroCertifie: 0,
          nomVoie: voies[1].nom,
          idVoie: voies[1]._id.toHexString(),
          color: color2,
        }
      }
    ]
  }
  t.deepEqual(funcRes, expectedRes)
})

test('numerosToGeoJSON', t => {
  const voies = [
    {
      _id: new mongo.ObjectId(),
      nom: 'voie1',
    },
    {
      _id: new mongo.ObjectId(),
      nom: 'voie2',
    }
  ]
  const toponymes = [
    {
      _id: new mongo.ObjectId(),
      nom: 'toponyme1',
    },
  ]
  const numeros = [
    {
      _id: new mongo.ObjectId(),
      voie: voies[0]._id,
      numero: 1,
      suffixe: 'ter',
      toponyme: toponymes[0]._id,
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
      voie: voies[1]._id,
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
  const color1 = randomColor({
    luminosity: 'dark',
    seed: voies[0]._id.toHexString()
  })
  const color2 = randomColor({
    luminosity: 'dark',
    seed: voies[1]._id.toHexString()
  })
  const funcRes = numerosToGeoJSON(voies, toponymes, numeros)
  const expectedRes = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: numeros[0].positions[0].point,
        properties: {
          type: 'adresse',
          id: numeros[0]._id.toHexString(),
          idNumero: numeros[0]._id.toHexString(),
          nomVoie: voies[0].nom,
          idVoie: voies[0]._id.toHexString(),
          idToponyme: toponymes[0]._id.toHexString(),
          nomToponyme: toponymes[0].nom,
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
          idNumero: numeros[1]._id.toHexString(),
          nomVoie: voies[1].nom,
          idVoie: voies[1]._id.toHexString(),
          idToponyme: null,
          nomToponyme: null,
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
