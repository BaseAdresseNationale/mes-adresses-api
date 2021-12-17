const test = require('ava')
const {extractFromCsv} = require('../extract-csv')

const csvFile = `cle_interop;uid_adresse;voie_nom;lieudit_complement_nom;numero;suffixe;commune_nom;position;long;lat;x;y;cad_parcelles;source;date_der_maj
55326_xxxx_00001;;Nouvelle Voie avec des numéros;;1;;Maulan;entrée;5.25237;48.668935;865837.51;6843339.94;64284000BI0459|64284000BI0450;;2021-04-27
55326_xxxx_00001;;Nouvelle Voie avec des numéros;;1;;Maulan;délivrance postale;5.25237;48.669494;865835.73;6843402.13;;;2021-04-27
55326_xxxx_00002;;Nouvelle Voie avec des numéros;;2;;Maulan;entrée;5.254912;48.667116;866030.41;6843143.15;;;2021-04-27
55326_xxxx_00003;;Nouvelle Voie avec des numéros;;3;;Maulan;entrée;5.255336;48.669354;866054.49;6843392.82;;;2021-04-27
55326_xxxx_00003;;Nouvelle Voie avec des numéros;;3;;Maulan;délivrance postale;5.256289;48.669914;866122.88;6843457.02;;;2021-04-27
55326_xxxx_00003;;Nouvelle Voie avec des numéros;;3;;Maulan;bâtiment;5.25576;48.670264;866082.79;6843494.77;;;2021-04-27
55326_xxxx_00003;;Nouvelle Voie avec des numéros;;3;;Maulan;logement;5.257137;48.670404;866183.7;6843513.22;;;2021-04-27
55326_xxxx_00001;;voie dans un toponyme;Nouveau Toponyme;1;;Maulan;entrée;5.255501;48.662923;866087.07;6842678.39;;;2021-04-27
55326_xxxx_00002;;voie dans un toponyme;Nouveau Toponyme;2;;Maulan;entrée;5.256137;48.663057;866133.48;6842694.64;;;2021-04-27
55326_xxxx_00001;;Voie à moitié dans un toponyme;Nouveau Toponyme;1;;Maulan;entrée;5.255077;48.6631;866055.3;6842697.21;;;2021-04-27
55326_xxxx_00002;;Voie à moitié dans un toponyme;Nouveau Toponyme;2;;Maulan;entrée;5.254396;48.663192;866004.84;6842706.03;;;2021-04-27
55326_xxxx_00003;;Voie à moitié dans un toponyme;;3;;Maulan;entrée;5.253747;48.663252;865956.9;6842711.29;;;2021-04-27
55326_xxxx_00004;;Voie à moitié dans un toponyme;;4;;Maulan;entrée;5.253197;48.663013;865917.16;6842683.62;;;2021-04-27
55326_xxxx_99999;;Nouveau Toponyme;;99999;;Maulan;segment;5.25504;48.663112;866052.5;6842698.52;;;2021-04-27
55326_xxxx_99999;;Toponyme Vide;;99999;;Maulan;segment;5.247276;48.664948;865475.13;6842886.26;;;2021-04-27`

test('import CSV file', async t => {
  const {isValid, accepted, numeros, voies, toponymes} = await extractFromCsv(Buffer.from(csvFile))

  t.true(isValid)
  t.is(accepted, 15)
  t.is(numeros.length, 9)
  t.is(voies.length, 3)
  t.is(toponymes.length, 2)
  t.deepEqual(numeros[0].parcelles, ['64284000BI0459', '64284000BI0450'])
  t.is(numeros[0].numero, 1)
})
