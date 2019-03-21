const test = require('ava')
const {voieToToponymeFeature, numeroVoieToAdresseFeature} = require('../geojson')

test('voieToToponymeFeature', t => {
  const voie = {
    _bal: 'foo',
    _id: 'totototo',
    code: 'A123',
    nom: 'rue de la gare',
    commune: '12345',
    source: 'Mairie',
    positions: [
      {
        type: 'segment',
        point: {type: 'Point', coordinates: [1, 2]}
      }
    ]
  }
  t.deepEqual(voieToToponymeFeature(voie), {
    type: 'Feature',
    geometry: {type: 'Point', coordinates: [1, 2]},
    properties: {
      type: 'toponyme',
      nom: 'rue de la gare',
      idVoie: 'totototo',
      typePosition: 'segment'
    }
  })
})

test('numeroVoieToAdresseFeature', t => {
  const numero = {
    _bal: 'bal',
    _id: 'foo',
    voie: 'bar',
    commune: '12345',
    numero: 12,
    suffixe: 'ter',
    source: 'Mairie',
    positions: [
      {
        type: 'entrée',
        point: {type: 'Point', coordinates: [4, 5]}
      }
    ]
  }
  const voie = {
    _bal: 'bal',
    _id: 'bar',
    code: 'A123',
    nom: 'rue de la gare',
    commune: '12345',
    source: 'Métropole'
  }
  t.deepEqual(numeroVoieToAdresseFeature(numero, voie), {
    type: 'Feature',
    geometry: {type: 'Point', coordinates: [4, 5]},
    properties: {
      type: 'adresse',
      idNumero: 'foo',
      nomVoie: 'rue de la gare',
      idVoie: 'bar',
      numero: 12,
      suffixe: 'ter',
      typePosition: 'entrée'
    }
  })
})
