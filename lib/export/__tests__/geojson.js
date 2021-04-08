const test = require('ava')
const {numeroVoieToAdresseFeature} = require('../geojson')

test('numeroVoieToAdresseFeature', t => {
  const numero = {
    _bal: 'bal',
    _id: 'foo',
    voie: 'bar',
    toponyme: '_toponyme',
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
      idToponyme: '_toponyme',
      numero: 12,
      suffixe: 'ter',
      typePosition: 'entrée'
    }
  })
})
