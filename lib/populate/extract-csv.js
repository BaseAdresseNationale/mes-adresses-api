const {validate} = require('@etalab/bal')
const {chain, groupBy, deburr} = require('lodash')
const {ObjectID} = require('../util/mongo')

function createPosition(positionRow) {
  return {
    source: positionRow.source || null,
    type: positionRow.typePosition || 'inconnue',
    point: {type: 'Point', coordinates: positionRow.position}
  }
}

function createVoie(idVoie, voieRow, positionsRows = []) {
  const dateMAJ = voieRow.dateMAJ ? new Date(voieRow.dateMAJ) : new Date()
  return {
    _id: idVoie,
    commune: voieRow.codeCommune,
    code: voieRow.codeVoie || null,
    nom: voieRow.nomVoie,
    positions: positionsRows.map(createPosition),
    _created: dateMAJ,
    _updated: dateMAJ

  }
}

function createNumero(idVoie, numeroRow, positionsRows = []) {
  const dateMAJ = numeroRow.dateMAJ ? new Date(numeroRow.dateMAJ) : new Date()
  return {
    voie: idVoie,
    commune: numeroRow.codeCommune,
    numero: numeroRow.numero,
    suffixe: numeroRow.suffixe || null,
    positions: positionsRows.map(createPosition),
    _created: dateMAJ,
    _updated: dateMAJ
  }
}

function extractVoiesNumeros(normalizedRows) {
  const voies = []
  const numeros = []

  chain(normalizedRows)
    .groupBy('idVoie')
    .forEach(voieRows => {
      const idVoie = new ObjectID()
      const ncGroups = groupBy(voieRows, r => `${r.numero}${r.suffixe ? r.suffixe.toUpperCase() : ''}`)

      voies.push(createVoie(idVoie, voieRows[0], (ncGroups['99999'] || []).filter(n => n.position)))

      Object.keys(ncGroups)
        .filter(nc => nc !== '99999')
        .forEach(nc => {
          const numeroRows = ncGroups[nc]
          const positionsRows = numeroRows.filter(n => n.position)
          numeros.push(createNumero(idVoie, numeroRows[0], positionsRows))
        })
    })
    .value()

  return {voies, numeros}
}

async function extractFromCsv(file) {
  try {
    const {validatedRows, normalizedRows} = await validate(file)

    if (!normalizedRows || normalizedRows.length === 0) {
      return {isValid: false, validationError: 'No data'}
    }

    const {voies, numeros} = extractVoiesNumeros(normalizedRows)

    return {
      isValid: true,
      accepted: normalizedRows.length,
      rejected: validatedRows.length - normalizedRows.length,
      voies,
      numeros
    }
  } catch (error) {
    return {isValid: false, validationError: error.message}
  }
}

module.exports = {extractFromCsv, extractVoiesNumeros}
