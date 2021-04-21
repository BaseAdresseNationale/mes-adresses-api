const {validate} = require('@etalab/bal')
const {groupBy, deburr, uniq, union} = require('lodash')
const {ObjectID} = require('../util/mongo')

function normalizeString(string) {
  return deburr(string.trim().toLowerCase())
}

function createPosition(positionRow) {
  return {
    source: positionRow.source || null,
    type: positionRow.typePosition || 'inconnue',
    point: {type: 'Point', coordinates: positionRow.position}
  }
}

function createVoie(idVoie, voieRow) {
  const dateMAJ = voieRow.date_der_maj ? new Date(voieRow.date_der_maj) : new Date()
  return {
    _id: idVoie,
    commune: voieRow.cle_interop.slice(0, 5),
    code: voieRow.codeVoie || null,
    nom: voieRow.voie_nom,
    _created: dateMAJ,
    _updated: dateMAJ

  }
}

function createNumero(idVoie, numeroRow, positionsRows = []) {
  const dateMAJ = numeroRow.date_der_maj ? new Date(numeroRow.date_der_maj) : new Date()
  return {
    voie: idVoie,
    commune: numeroRow.cle_interop.slice(0, 5),
    numero: numeroRow.numero,
    toponyme: numeroRow.toponyme || null,
    suffixe: numeroRow.suffixe || null,
    positions: positionsRows.map(positionRow => createPosition(positionRow)),
    _created: dateMAJ,
    _updated: dateMAJ
  }
}

function createToponyme(idToponyme, nomToponyme, commune, positions) {
  const dateMAJ = new Date()
  return {
    _id: idToponyme,
    nom: nomToponyme,
    commune,
    positions,
    _created: dateMAJ,
    _updated: dateMAJ
  }
}

function groupToponymes(toponymes, complements) {
  return groupBy([...toponymes, ...complements], r => {
    const nom = normalizeString(r.lieudit_complement_nom || r.nom_voie)
    return `${nom}`
  })
}

function prepareToponymes(toponymes, complements) {
  const groupedToponymes = groupToponymes(toponymes, complements)

  return Object.keys(groupedToponymes).map(key => {
    const adresses = groupedToponymes[key]

    const nomToponyme = adresses[0].lieudit_complement_nom || adresses[0].nom_voie
    return {
      nomToponyme,
      positions: uniq(adresses.filter(a => a.numero === 99999).map(a => createPosition(a))),
      numerosToponyme: adresses.filter(a => a.numero !== 99999),
      commune: adresses[0].cle_interop.slice(0, 5)
    }
  })
}

function extractVoiesNumeros(normalizedRows) {
  const voies = []
  const numeros = []

  const filteredNumeros = normalizedRows.filter(r => r.numero !== 99999)
  const toponymesAddresses = normalizedRows.filter(({numero}) => numero === 99999)
  const complements = normalizedRows.filter(r => r.lieudit_complement_nom)
  const preparedToponymes = prepareToponymes(toponymesAddresses, complements)

  const toponymes = preparedToponymes.map(({nomToponyme, numerosToponyme, positions, commune}) => {
    const idToponyme = new ObjectID()

    if (numerosToponyme.length > 0) {
      numerosToponyme.forEach(numero => {
        numero.toponyme = idToponyme
        numeros.push(numero)
      })
    }

    return createToponyme(idToponyme, nomToponyme, commune, positions)
  })

  const numerosRows = union(filteredNumeros, numeros)
  const voiesGroups = groupBy(numerosRows, 'voie_nom')

  Object.keys(voiesGroups).map(voie => {
    const idVoie = new ObjectID()
    const numeroRow = voiesGroups[voie]
    voies.push(createVoie(idVoie, numeroRow[0]))

    return numeroRow.map(numero => {
      const positionsRows = [
        {
          source: numero.source,
          typePosition: numero.position,
          position: [numero.long, numero.lat]
        }
      ]
      return numeros.push(createNumero(idVoie, numero, positionsRows))
    })
  })

  return {voies, numeros, toponymes}
}

async function extractFromCsv(file) {
  try {
    const {rows, parseOk} = await validate(file)

    if (!parseOk) {
      return {isValid: false}
    }

    const accepted = rows.filter(({isValid}) => isValid)
    const rejected = rows.filter(({isValid}) => !isValid)
    const parsedValues = accepted.map(({parsedValues}) => parsedValues)

    const {voies, numeros, toponymes} = extractVoiesNumeros(parsedValues)

    return {
      isValid: true,
      accepted: accepted.length,
      rejected: rejected.length,
      voies,
      numeros,
      toponymes
    }
  } catch (error) {
    return {isValid: false, validationError: error.message}
  }
}

module.exports = {extractFromCsv, extractVoiesNumeros, normalizeString}
