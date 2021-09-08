/* eslint camelcase: off */
const test = require('ava')
const {roundCoordinate, formatCleInterop, createRow, exportAsCsv, toCsvBoolean} = require('../csv-bal')
const {ObjectID} = require('../../util/mongo')

test('roundCoordinate', t => {
  t.is(roundCoordinate(1.11111111111111, 0), 1)
  t.is(roundCoordinate(1.11111111111111, 5), 1.11111)
  t.is(roundCoordinate(1.999999, 2), 2)
})

test('formatCleInterop', t => {
  t.is(formatCleInterop('12345', 'A100', 12), '12345_a100_00012')
  t.is(formatCleInterop('1a345', 'A100', 12), '1a345_a100_00012')
  t.is(formatCleInterop('1a345', 'A100', 12, 'bis'), '1a345_a100_00012_bis')
})

test('toCsvBoolean', t => {
  t.is(toCsvBoolean(undefined), '')
  t.is(toCsvBoolean(null), '')
  t.is(toCsvBoolean(true), '1')
  t.is(toCsvBoolean(false), '0')
})

test('createRow', t => {
  t.deepEqual(createRow({
    codeCommune: '54084',
    codeVoie: 'XXXX',
    nomVoie: 'rue des peupliers',
    nomToponyme: 'Le Moulin',
    numero: 12,
    suffixe: 'bis',
    certifie: true,
    _updated: new Date('2019-01-01'),
    position: {
      source: 'Mairie',
      type: 'entrée',
      point: {
        type: 'Point',
        coordinates: [5.835188, 49.326038]
      }
    },
    parcelles: ['12345000AA0001', '12345000AA0002']
  }), {
    cle_interop: '54084_xxxx_00012_bis',
    uid_adresse: '',
    voie_nom: 'rue des peupliers',
    lieudit_complement_nom: 'Le Moulin',
    numero: '12',
    suffixe: 'bis',
    certification_commune: '1',
    commune_nom: 'Mont-Bonvillers',
    position: 'entrée',
    long: '5.835188',
    lat: '49.326038',
    x: '906109.41',
    y: '6917751.73',
    cad_parcelles: '12345000AA0001|12345000AA0002',
    source: 'Mairie',
    date_der_maj: '2019-01-01'
  })
})

test('exportAsCsv', async t => {
  const voie1 = {
    _id: new ObjectID(),
    commune: '54084',
    nom: 'allée des acacias',
    code: '6789',
    _updated: new Date('2019-01-01')
  }
  const voie2 = {
    _id: new ObjectID(),
    commune: '54084',
    nom: 'rue des aulnes',
    code: 'A100',
    _updated: new Date('2019-01-05')
  }

  const hameau = {
    _id: new ObjectID(),
    nom: 'La Varenne',
    commune: '54084',
    positions: [],
    _updated: new Date('2019-01-05')
  }
  const lieuDit = {
    _id: new ObjectID(),
    nom: 'Le Moulin',
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
      _updated: new Date('2019-02-01')
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

  const csv = await exportAsCsv({voies: [voie1, voie2], toponymes: [hameau, lieuDit], numeros})
  const expected = `cle_interop;uid_adresse;voie_nom;lieudit_complement_nom;numero;suffixe;certification_commune;commune_nom;position;long;lat;x;y;cad_parcelles;source;date_der_maj
54084_6789_00000_bis;;allée des acacias;;0;bis;1;Mont-Bonvillers;;;;;;;;2019-02-01
54084_6789_00006;;allée des acacias;La Varenne;6;;0;Mont-Bonvillers;entrée;5.83315;49.324433;905967.72;6917567.98;12345000AA0001|12345000AA0002;Mairie;2019-02-05
54084_xxxx_99999;;La Varenne;;99999;;;Mont-Bonvillers;;;;;;;;2019-01-05
54084_xxxx_99999;;Le Moulin;;99999;;;Mont-Bonvillers;segment;5.83315;49.324433;905967.72;6917567.98;12345000AA0001|12345000AA0002;Mairie;2019-01-05`.replace(/\n/g, '\r\n') + '\r\n'
  t.is(csv, expected)
})
