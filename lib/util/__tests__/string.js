const test = require('ava')
const {beautifyUppercased, beautifyNomAlt} = require('../string')

test('beautifyUppercased()', t => {
  t.is(beautifyUppercased('Impasse Louis XVI'), 'Impasse Louis XVI')
  t.is(beautifyUppercased('impasse louis xvi'), 'impasse louis xvi')
  t.is(beautifyUppercased('IMPASSE LOUIS XVI'), 'Impasse Louis XVI')
  t.is(beautifyUppercased('RUE DES PEUPLIERS'), 'Rue des Peupliers')
})

test('beautifyNomAlt()', t => {
  t.deepEqual(beautifyNomAlt({
    fra: 'NOM ALT FRANÇAIS',
    bre: 'NOM ALT BRETON',
    eus: 'NOM ALT BASQUE',
    gsw: 'NOM ALT ALSACIEN',
    cos: 'NOM ALT CORSE',
    gcr: 'NOM ALT GUYANAIS',
    gcf: 'NOM ALT GUADELOUPÉEN-MARTINIQUAIS',
    rcf: 'NOM ALT RÉUNIONNAIS',
    swb: 'NOM ALT MAHORAIS',
    oci: 'NOM ALT OCCITAN'
  }), {
    fra: 'Nom Alt Français',
    bre: 'Nom Alt Breton',
    eus: 'Nom Alt Basque',
    gsw: 'Nom Alt Alsacien',
    cos: 'Nom Alt Corse',
    gcr: 'Nom Alt Guyanais',
    gcf: 'Nom Alt Guadeloupéen-Martiniquais',
    rcf: 'Nom Alt Réunionnais',
    swb: 'Nom Alt Mahorais',
    oci: 'Nom Alt Occitan'
  })
})
