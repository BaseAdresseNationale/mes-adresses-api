const csvWriter = require('csv-write-stream')
const getStream = require('get-stream')
const intoStream = require('into-stream')
const pumpify = require('pumpify')

function createHeader(rows) {
  const headers = new Set()

  for (const row of rows) {
    for (const header of Object.keys(row)) {
      headers.add(header)
    }
  }

  return [...headers]
}

function createKeysNomAlts(models) {
  const keysNomAlts = {}

  for (const model of models) {
    if (model.nomAlt) {
      Object.keys(model.nomAlt).forEach(o => {
        keysNomAlts[o] = `nom_alt_${o}`
      })
    }
  }

  return keysNomAlts
}

function modelToRow(type, model, numeros, keysNomAlts) {
  const numerosVoie = numeros.filter(n => model._id.toHexString() === n[type]?.toHexString())

  const row = {
    type,
    nom: model.nom || '',
  }

  row.nombre_de_numeros = numerosVoie.length // eslint-disable-line camelcase
  row.numeros = numerosVoie.length > 0 ? numerosVoie.map(n => String(n.numero) + (n.suffixe || '')).join(' ') : ''

  for (const key in keysNomAlts) {
    if (Object.hasOwnProperty.call(keysNomAlts, key)) {
      row[keysNomAlts[key]] = (model.nomAlt && model.nomAlt[key]) ? model.nomAlt[key] : null
    }
  }

  return row
}

function voiesToCsv(voies, toponymes, numeros) {
  const keysNomAlts = createKeysNomAlts([...voies, ...toponymes])
  const rows = [
    ...voies.map(v => modelToRow('voie', v, numeros, keysNomAlts)),
    ...toponymes.map(t => modelToRow('toponyme', t, numeros, keysNomAlts))
  ]
  const header = createHeader(rows)

  return getStream(pumpify.obj(
    intoStream.object(rows),
    csvWriter({separator: ';', newline: '\r\n', header})
  ))
}

module.exports = {voiesToCsv}
