const csvWriter = require('csv-write-stream')
const getStream = require('get-stream')
const intoStream = require('into-stream')
const {keyBy} = require('lodash')
const pumpify = require('pumpify')
const proj = require('@etalab/project-legal')
const {getCommune} = require('../util/cog')

function roundCoordinate(coordinate, precision) {
  return Number.parseFloat(coordinate.toFixed(precision))
}

function formatCleInterop(codeCommune, codeVoie, numero, suffixe) {
  const str = `${codeCommune}_${codeVoie}_${numero.toString().padStart(5, '0')}`
  if (!suffixe) {
    return str.toLowerCase()
  }

  return (str + '_' + suffixe).toLowerCase()
}

// Convertie "certifie" en booleen CSV (0 ou 1)
// Gère les valeurs undefined comme cela peut être le cas pour les toponyme
function toCsvBoolean(certifie) {
  if (certifie === undefined || certifie === null) {
    return ''
  }

  return certifie ? '1' : '0'
}

function extractHeaders(csvRows) {
  const headers = new Set()

  for (const row of csvRows) {
    for (const header of Object.keys(row)) {
      headers.add(header)
    }
  }
}

/* eslint camelcase: off */
function createRow(obj) {
  const row = {
    cle_interop: formatCleInterop(obj.codeCommune, obj.codeVoie, obj.numero, obj.suffixe),
    uid_adresse: '',
    voie_nom: obj.nomVoie,
    lieudit_complement_nom: obj.nomToponyme || '',
    numero: Number.isInteger(obj.numero) ? obj.numero.toString() : '',
    suffixe: obj.suffixe || '',
    certification_commune: toCsvBoolean(obj.certifie),
    commune_insee: obj.codeCommune,
    commune_nom: getCommune(obj.codeCommune).nom,
    position: '',
    long: '',
    lat: '',
    x: '',
    y: '',
    cad_parcelles: obj.parcelles ? obj.parcelles.join('|') : '',
    source: obj.source || 'commune',
    date_der_maj: obj._updated ? obj._updated.toISOString().slice(0, 10) : ''
  }

  if (obj.nomVoieAlt) {
    Object.keys(obj.nomVoieAlt).forEach(o => {
      row['voie_nom_' + o] = obj.nomVoieAlt[o]
    })
  }

  if (obj.nomToponymeAlt) {
    Object.keys(obj.nomToponymeAlt).forEach(o => {
      row['lieudit_complement_nom_' + o] = obj.nomToponymeAlt[o]
    })
  }

  if (obj.position) {
    const coordsPosition = obj.position.point.coordinates
    const projectedCoords = proj(coordsPosition)
    row.position = obj.position.type
    row.source = obj.position.source || 'commune'
    row.long = roundCoordinate(coordsPosition[0], 6).toString()
    row.lat = roundCoordinate(coordsPosition[1], 6).toString()
    if (projectedCoords) {
      row.x = projectedCoords[0].toString()
      row.y = projectedCoords[1].toString()
    }
  }

  return row
}

async function exportAsCsv({voies, toponymes, numeros}) {
  const voiesIndex = keyBy(voies, v => v._id.toHexString())
  const rows = []

  numeros.forEach(n => {
    const voieId = n.voie.toHexString()
    const v = voiesIndex[voieId]

    if (n.toponyme) {
      const toponyme = toponymes.find((({_id}) => _id.equals(n.toponyme)))

      if (!toponyme) {
        throw new Error(`Toponyme ${n.toponyme} introuvable dans la base de données`)
      }

      n.toponyme = toponyme
    }

    if (n.positions && n.positions.length > 0) {
      n.positions.forEach(p => {
        rows.push({
          codeCommune: n.commune,
          codeVoie: v.code || 'xxxx',
          numero: n.numero,
          suffixe: n.suffixe,
          certifie: n.certifie || false,
          _updated: n._updated,
          nomVoie: v.nom,
          nomVoieAlt: v.nomAlt || null,
          nomToponyme: n.toponyme ? n.toponyme.nom : null,
          nomToponymeAlt: n?.toponyme?.nomAlt || null,
          parcelles: n.parcelles,
          position: p
        })
      })
    }
  })

  toponymes.forEach(t => {
    if (t.positions.length > 0) {
      t.positions.forEach(p => {
        rows.push({
          codeCommune: t.commune,
          codeVoie: t.code || 'xxxx',
          numero: 99999,
          _updated: t._updated,
          nomVoie: t.nom,
          nomVoieAlt: t.nomAlt || null,
          parcelles: t.parcelles,
          position: p
        })
      })
    } else {
      rows.push({
        codeCommune: t.commune,
        codeVoie: t.code || 'xxxx',
        numero: 99999,
        _updated: t._updated,
        nomVoie: t.nom,
        nomVoieAlt: t.nomAlt || null,
        parcelles: t.parcelles
      })
    }
  })

  const csvRows = rows.map(row => createRow(row))
  const headers = extractHeaders(csvRows)

  return getStream(pumpify.obj(
    intoStream.object(csvRows),
    csvWriter({separator: ';', newline: '\r\n', headers})
  ))
}

module.exports = {roundCoordinate, formatCleInterop, createRow, exportAsCsv, toCsvBoolean}
