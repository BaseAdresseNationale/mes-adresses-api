const {validate} = require('@ban-team/validateur-bal')
const {chain, compact, deburr, keyBy, min, max} = require('lodash')
const {ObjectId} = require('../util/mongo')

function extractCodeCommune({parsedValues, additionalValues}) {
  return parsedValues.commune_insee
  || additionalValues?.cle_interop?.codeCommune
}

function normalizeString(string) {
  return deburr(string.trim().toLowerCase())
}

function extractPosition(row) {
  return {
    source: row.parsedValues.source || null,
    type: row.parsedValues.position || 'inconnue',
    point: {type: 'Point', coordinates: [row.parsedValues.long, row.parsedValues.lat]}
  }
}

function extractPositions(rows) {
  return rows.filter(r => r.parsedValues.long && r.parsedValues.lat).map(r => extractPosition(r))
}

function extractDate(row) {
  if (row.parsedValues.date_der_maj) {
    return new Date(row.parsedValues.date_der_maj)
  }
}

function extractData(rows, codeCommune) {
  const toponymes = chain(rows)
    .filter(r => r.parsedValues.numero === 99999)
    .groupBy(r => normalizeString(r.parsedValues.voie_nom))
    .map(toponymeRows => {
      const date = extractDate(toponymeRows[0]) || new Date()

      return {
        _id: new ObjectId(),
        commune: codeCommune,
        nom: toponymeRows[0].parsedValues.voie_nom,
        nomAlt: toponymeRows[0].localizedValues.voie_nom || null,
        positions: extractPositions(toponymeRows),
        _created: date,
        _updated: date
      }
    })
    .value()

  const toponymesIndex = keyBy(toponymes, t => normalizeString(t.nom))

  const voies = chain(rows)
    .filter(r => r.parsedValues.numero !== 99999)
    .groupBy(r => normalizeString(r.parsedValues.voie_nom))
    .map(voieRows => {
      const dates = compact(voieRows.map(r => r.parsedValues.date_der_maj))

      return {
        _id: new ObjectId(),
        commune: codeCommune,
        nom: voieRows[0].parsedValues.voie_nom,
        nomAlt: voieRows[0].localizedValues.voie_nom || null,
        _created: dates.length > 0 ? new Date(min(dates)) : new Date(),
        _updated: dates.length > 0 ? new Date(max(dates)) : new Date()
      }
    })
    .value()

  const voiesIndex = keyBy(voies, v => normalizeString(v.nom))

  const numeros = chain(rows)
    .filter(r => r.parsedValues.numero !== 99999)
    .groupBy(r => `${r.parsedValues.numero}@@@${r.parsedValues.suffixe}@@@${normalizeString(r.parsedValues.voie_nom)}`)
    .map(numeroRows => {
      const date = extractDate(numeroRows[0]) || new Date()

      const voieString = normalizeString(numeroRows[0].parsedValues.voie_nom)
      const toponymeString = numeroRows[0].parsedValues.lieudit_complement_nom ? normalizeString(numeroRows[0].parsedValues.lieudit_complement_nom) : null
      const toponymeAlt = numeroRows[0].localizedValues.lieudit_complement_nom || null

      if (toponymeString && !(toponymeString in toponymesIndex)) {
        const toponyme = {
          _id: new ObjectId(),
          commune: codeCommune,
          nom: numeroRows[0].parsedValues.lieudit_complement_nom,
          nomAlt: toponymeAlt,
          positions: [],
          parcelles: numeroRows[0].parsedValues.cad_parcelles,
          _created: new Date(),
          _updated: new Date()
        }

        toponymes.push(toponyme)
        toponymesIndex[toponymeString] = toponyme
      }

      return {
        _id: new ObjectId(),
        commune: codeCommune,
        voie: voiesIndex[voieString]._id,
        toponyme: toponymeString ? toponymesIndex[toponymeString]._id : null,
        numero: numeroRows[0].parsedValues.numero,
        suffixe: numeroRows[0].parsedValues.suffixe || null,
        certifie: numeroRows[0].parsedValues.certification_commune,
        positions: extractPositions(numeroRows),
        parcelles: numeroRows[0].parsedValues.cad_parcelles,
        _created: date,
        _updated: date
      }
    })
    .value()

  return {voies, numeros, toponymes}
}

async function extractFromCsv(file, codeCommune) {
  try {
    const {rows, parseOk} = await validate(file, {relaxFieldsDetection: true})

    if (!parseOk) {
      return {isValid: false}
    }

    const accepted = rows.filter(({isValid}) => isValid)
    const rejected = rows.filter(({isValid}) => !isValid)

    const communesData = extractData(
      accepted.filter(r => extractCodeCommune(r) === codeCommune),
      codeCommune
    )

    return {
      isValid: true,
      accepted: accepted.length,
      rejected: rejected.length,
      voies: communesData.voies,
      numeros: communesData.numeros,
      toponymes: communesData.toponymes
    }
  } catch (error) {
    return {isValid: false, validationError: error.message}
  }
}

module.exports = {extractFromCsv, extractData, normalizeString}
