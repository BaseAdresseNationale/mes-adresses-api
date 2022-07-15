const {validate} = require('@ban-team/validateur-bal')
const {chain, compact, deburr, keyBy, min, max} = require('lodash')
const {ObjectId} = require('../util/mongo')

const validAltLang = new Set(['voie_nom_fra', 'voie_nom_bre', 'voie_nom_eus', 'voie_nom_asw', 'voie_nom_cos', 'voie_nom_gyn', 'voie_nom_rcf', 'voie_nom_oci'])

function extractCodeCommune({parsedValues, additionalValues}) {
  return parsedValues.commune_insee
  || additionalValues?.cle_interop?.codeCommune
}

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

function extractValidAltKeys(row) {
  const altKeysArr = []
  const altKeys = Object.keys(row).filter(r => validAltLang.has(r))
  altKeys.forEach(k => altKeysArr.push(k))

  return altKeysArr
}

function addAltKeyValue(row) {
  const keys = extractValidAltKeys(row)
  const newObj = {}

  keys.forEach(k => {
    newObj[k.slice(-3)] = row[k]
  })

  return newObj
}

function addAltLang(rows) {
  rows.forEach(row => {
    const newRow = addAltKeyValue(row)

    if (Object.keys(newRow).length > 0) {
      row.nomAlt = newRow
    }
  })

  return rows
}

function extractData(rows, codeCommune) {
  const rowsWithAltLang = addAltLang(rows)

  const toponymes = chain(rowsWithAltLang)
    .filter(r => r.numero === 99999)
    .groupBy(r => normalizeString(r.voie_nom))
    .map(toponymeRows => {
      const date = extractDate(toponymeRows[0]) || new Date()

      return {
        _id: new ObjectId(),
        commune: codeCommune,
        nom: toponymeRows[0].voie_nom,
        nomAlt: toponymeRows[0].nomAlt || null,
        positions: extractPositions(toponymeRows),
        _created: date,
        _updated: date
      }
    })
    .value()

  const toponymesIndex = keyBy(toponymes, t => normalizeString(t.nom))

  const voies = chain(rowsWithAltLang)
    .filter(r => r.numero !== 99999)
    .groupBy(r => normalizeString(r.voie_nom))
    .map(voieRows => {
      const dates = compact(voieRows.map(r => r.date_der_maj))

      return {
        _id: new ObjectId(),
        commune: codeCommune,
        nom: voieRows[0].voie_nom,
        nomAlt: voieRows[0].nomAlt || null,
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
          _id: new ObjectId(),
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
        _id: new ObjectId(),
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

async function extractFromCsv(file, codeCommune) {
  try {
    const {rows, parseOk} = await validate(file, {relaxFieldsDetection: true})

    if (!parseOk) {
      return {isValid: false}
    }

    const accepted = rows.filter(({isValid}) => isValid)
    const rejected = rows.filter(({isValid}) => !isValid)
    const parsedValues = accepted.filter(r => extractCodeCommune(r) === codeCommune)
      .map(({parsedValues}) => parsedValues)

    const communesData = extractData(parsedValues, codeCommune)

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
