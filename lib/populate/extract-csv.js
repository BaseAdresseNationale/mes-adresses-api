const {validate} = require('@etalab/bal')
const {flatten, chain, compact, deburr, keyBy, min, max} = require('lodash')
const {ObjectID} = require('../util/mongo')

function normalizeString(string) {
  return deburr(string.trim().toLowerCase())
}

function extractPosition(row) {
  return {
    source: row.source || null,
    type: row.position || 'inconnue',
    point: {type: 'Point', coordinates: [row.long, row.lat]}
  }
}

function extractPositions(rows) {
  return rows.filter(r => r.long && r.lat).map(r => extractPosition(r))
}

function extractDate(row) {
  if (row.date_der_maj) {
    return new Date(row.date_der_maj)
  }
}

function extractData(rows, {codeCommune}) {
  const toponymes = chain(rows)
    .filter(r => r.numero === 99999)
    .groupBy(r => normalizeString(r.voie_nom))
    .map(toponymeRows => {
      const date = extractDate(toponymeRows[0]) || new Date()

      return {
        _id: new ObjectID(),
        commune: codeCommune,
        nom: toponymeRows[0].voie_nom,
        positions: extractPositions(toponymeRows),
        _created: date,
        _updated: date
      }
    })
    .value()

  const toponymesIndex = keyBy(toponymes, t => normalizeString(t.nom))

  const voies = chain(rows)
    .filter(r => r.numero !== 99999)
    .groupBy(r => normalizeString(r.voie_nom))
    .map(voieRows => {
      const dates = compact(voieRows.map(r => r.date_der_maj))

      return {
        _id: new ObjectID(),
        commune: codeCommune,
        nom: voieRows[0].voie_nom,
        _created: dates.length > 0 ? new Date(min(dates)) : new Date(),
        _updated: dates.length > 0 ? new Date(max(dates)) : new Date()
      }
    })
    .value()

  const voiesIndex = keyBy(voies, v => normalizeString(v.nom))

  const numeros = chain(rows)
    .filter(r => r.numero !== 99999)
    .groupBy(r => `${r.numero}@@@${r.suffixe}@@@${normalizeString(r.voie_nom)}`)
    .map(numeroRows => {
      const date = extractDate(numeroRows[0]) || new Date()

      const voieString = normalizeString(numeroRows[0].voie_nom)
      const toponymeString = numeroRows[0].lieudit_complement_nom ? normalizeString(numeroRows[0].lieudit_complement_nom) : null

      if (toponymeString && !(toponymeString in toponymesIndex)) {
        const toponyme = {
          _id: new ObjectID(),
          commune: codeCommune,
          nom: numeroRows[0].lieudit_complement_nom,
          positions: [],
          parcelles: numeroRows[0].cad_parcelles,
          _created: new Date(),
          _updated: new Date()
        }

        toponymes.push(toponyme)
        toponymesIndex[toponymeString] = toponyme
      }

      return {
        _id: new ObjectID(),
        commune: codeCommune,
        voie: voiesIndex[voieString]._id,
        toponyme: toponymeString ? toponymesIndex[toponymeString]._id : null,
        numero: numeroRows[0].numero,
        suffixe: numeroRows[0].suffixe || null,
        certifie: numeroRows[0].certification_commune,
        positions: extractPositions(numeroRows),
        parcelles: numeroRows[0].cad_parcelles,
        _created: date,
        _updated: date
      }
    })
    .value()

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

    const communesData = chain(parsedValues)
      .groupBy(row => row.cle_interop.slice(0, 5))
      .mapValues((communeRows, codeCommune) => {
        return extractData(communeRows, {codeCommune})
      })
      .value()

    return {
      isValid: true,
      accepted: accepted.length,
      rejected: rejected.length,
      voies: flatten(Object.values(communesData).map(d => d.voies)),
      numeros: flatten(Object.values(communesData).map(d => d.numeros)),
      toponymes: flatten(Object.values(communesData).map(d => d.toponymes))
    }
  } catch (error) {
    return {isValid: false, validationError: error.message}
  }
}

module.exports = {extractFromCsv, extractData, normalizeString}
