const test = require('ava')
const {numeroVoieToAdresseFeature} = require('../geojson')

test('numeroVoieToAdresseFeature', t => {
  const numero = {
    _bal: 'bal',
    _id: 'foo',
    voie: 'bar',
    toponyme: '_toponyme',
    nomToponyme: null,
    commune: '12345',
    numero: 12,
    suffixe: 'ter',
    source: 'Mairie',
    positions: [
      {
        type: 'entrée',
        point: {type: 'Point', coordinates: [4, 5]}
      }
    ],
    parcelles: ['12345666AA', '12345666BB']
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
      idToponyme: '_toponyme',
      nomToponyme: null,
      numero: 12,
      suffixe: 'ter',
      typePosition: 'entrée',
      parcelles: ['12345666AA', '12345666BB']
    }
  })
})

test('numeroVoieToAdresseFeature with toponyme', t => {
  const numero = {
    _bal: 'bal',
    _id: 'foo',
    voie: 'bar',
    toponyme: '_toponyme',
    nomToponyme: 'le moulin',
    commune: '12345',
    numero: 12,
    suffixe: 'ter',
    source: 'Mairie',
    positions: [
      {
        type: 'entrée',
        point: {type: 'Point', coordinates: [4, 5]}
      }
    ],
    parcelles: ['12345666AA', '12345666BB']
  }
  const voie = {
    _bal: 'bal',
    _id: 'bar',
    code: 'A123',
    nom: 'rue de la gare',
    commune: '12345',
    source: 'Métropole'
  }
  const toponyme = {
    _id: '_toponyme',
    nom: 'le moulin'
  }
  t.deepEqual(numeroVoieToAdresseFeature(numero, voie, toponyme), {
    type: 'Feature',
    geometry: {type: 'Point', coordinates: [4, 5]},
    properties: {
      type: 'adresse',
      idNumero: 'foo',
      nomVoie: 'rue de la gare',
      idVoie: 'bar',
      idToponyme: '_toponyme',
      nomToponyme: 'le moulin',
      numero: 12,
      suffixe: 'ter',
      typePosition: 'entrée',
      parcelles: ['12345666AA', '12345666BB']
    }
  })
})
