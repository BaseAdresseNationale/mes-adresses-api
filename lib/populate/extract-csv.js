const {validate} = require('@etalab/bal')
const {groupBy, deburr, countBy, union} = require('lodash')
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

function createVoie(idVoie, voieRow, positionsRows = []) {
  const dateMAJ = voieRow.date_der_maj ? new Date(voieRow.date_der_maj) : new Date()
  return {
    _id: idVoie,
    commune: voieRow.cle_interop.slice(0, 5),
    code: voieRow.codeVoie || null,
    nom: voieRow.voie_nom,
    positions: positionsRows.map(positionRow => createPosition(positionRow)),
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

function createLieuDit(idToponyme, toponymeRow, positionsRows = []) {
  const dateMAJ = toponymeRow.date_der_maj ? new Date(toponymeRow.date_der_maj) : new Date()
  return {
    _id: idToponyme,
    nom: toponymeRow.voie_nom,
    commune: toponymeRow.cle_interop.slice(0, 5),
    positions: positionsRows.map(positionRow => createPosition(positionRow)),
    _created: dateMAJ,
    _updated: dateMAJ
  }
}

function createHameau(idToponyme, nomToponyme, commune) {
  const dateMAJ = new Date()
  return {
    _id: idToponyme,
    nom: nomToponyme,
    commune,
    _created: dateMAJ,
    _updated: dateMAJ
  }
}

function formatHameaux(hameaux) {
  const hameauxGroups = groupBy(hameaux, r => normalizeString(r.lieudit_complement_nom))
  const formattedHameaux = []

  Object.values(hameauxGroups).forEach(hameau => {
    const countedToponymes = countBy(hameau, r => `${r.lieudit_complement_nom}__${r.cle_interop.slice(0, 5)}`)
    const [sortedToponymes] = Object.entries(countedToponymes).sort((a, b) => b[1] - a[1])
    const [nomToponyme, commune] = sortedToponymes[0].split('__')
    formattedHameaux.push({
      nomToponyme,
      numerosRows: hameau,
      commune
    })
  })

  return formattedHameaux
}

function extractVoiesNumeros(normalizedRows) {
  const voies = []
  const numeros = []
  const toponymes = []
  const numerosWithToponyme = []

  const filteredNumeros = normalizedRows.filter(r => r.numero !== 99999)
  const lieuxDits = normalizedRows.filter(({numero}) => numero === 99999)
  const hameaux = normalizedRows.filter(r => r.lieudit_complement_nom)
  const hasHameaux = hameaux.length > 0

  if (hasHameaux) {
    const formattedHameaux = formatHameaux(hameaux)

    formattedHameaux.forEach(({nomToponyme, numerosRows, commune}) => {
      const idToponyme = new ObjectID()
      toponymes.push(createHameau(idToponyme, nomToponyme, commune))

      numerosRows.forEach(numero => {
        numero.toponyme = idToponyme
        numerosWithToponyme.push(numero)
      })
    })
  }

  const numerosRows = hasHameaux ? union(filteredNumeros, numerosWithToponyme) : filteredNumeros
  const voiesGroups = groupBy(numerosRows, 'voie_nom')
  const toponymesGroups = groupBy(lieuxDits, 'voie_nom')

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

  Object.keys(toponymesGroups).map(toponyme => {
    const idToponyme = new ObjectID()
    const toponymeRows = toponymesGroups[toponyme]
    const positionsRows = toponymeRows.map(({source, position, long, lat}) => {
      return {
        source,
        typePosition: position,
        position: [long, lat]
      }
    })
    return toponymes.push(createLieuDit(idToponyme, toponymeRows[0], positionsRows))
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

module.exports = {extractFromCsv, extractVoiesNumeros}
