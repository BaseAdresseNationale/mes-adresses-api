/* eslint camelcase: off */
const test = require('ava')
const {voiesToCsv} = require('../csv-voies')
const {ObjectId} = require('../../util/mongo')

test('voiesToCsv', async t => {
  const voie1 = {
    _id: new ObjectId(),
    commune: '54084',
    nom: 'allée des acacias',
    complement: 'complement',
    code: '6789',
    _updated: new Date('2019-01-01')
  }
  const voie2 = {
    _id: new ObjectId(),
    commune: '54084',
    nom: 'rue des aulnes',
    nomAlt: {
      gsw: 'Akazienallee',
      bre: 'brasil'
    },
    code: 'A100',
    _updated: new Date('2019-01-05')
  }

  const hameau = {
    _id: new ObjectId(),
    nom: 'La Varenne',
    commune: '54084',
    positions: [],
    _updated: new Date('2019-01-05')
  }
  const lieuDit = {
    _id: new ObjectId(),
    nom: 'Le Moulin',
    nomAlt: {
      gsw: 'Die Mühle'
    },
    commune: '54084',
    positions: [{
      type: 'segment',
      source: 'Mairie',
      point: {
        type: 'Point',
        coordinates: [5.83315, 49.324433]
      }
    }],
    parcelles: ['12345000AA0001', '12345000AA0002'],
    _updated: new Date('2019-01-05')
  }

  const numeros = [
    {
      voie: voie1._id,
      commune: '54084',
      numero: 0,
      suffixe: 'bis',
      certifie: true,
      positions: [],
      parcelles: [],
      _updated: new Date('2019-02-01'),
    },
    {
      voie: voie1._id,
      commune: '54084',
      toponyme: hameau._id,
      numero: 6,
      certifie: false,
      positions: [{
        type: 'entrée',
        source: 'Mairie',
        point: {
          type: 'Point',
          coordinates: [5.83315, 49.324433]
        }
      }],
      parcelles: ['12345000AA0001', '12345000AA0002'],
      _updated: new Date('2019-02-05')
    }
  ]

  const csv = await voiesToCsv([voie1, voie2], [hameau, lieuDit], numeros)
  const expected = `type;nom;nombre_de_numeros;numeros;nom_alt_gsw;nom_alt_bre
voie;allée des acacias;2;0bis 6;;
voie;rue des aulnes;0;;Akazienallee;brasil
toponyme;La Varenne;1;6;;
toponyme;Le Moulin;0;;Die Mühle;`.replace(/\n/g, '\r\n') + '\r\n'
  t.is(csv, expected)
})
