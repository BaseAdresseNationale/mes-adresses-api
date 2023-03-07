const express = require('express')
const createHttpError = require('http-errors')
const csvWriter = require('csv-write-stream')
const getStream = require('get-stream')
const intoStream = require('into-stream')
const pumpify = require('pumpify')

const mongo = require('../util/mongo')
const w = require('../util/w')
const BaseLocale = require('../models/base-locale')

const app = new express.Router()

app.get('/emails.csv', w(async (req, res) => {
  const emails = await mongo.db.collection('bases_locales')
    .distinct('emails')

  const csvContent = await getStream(pumpify.obj(
    intoStream.object(emails.filter(Boolean).map(email => ({email}))),
    csvWriter()
  ))

  res.set('Content-Type', 'text/csv').send(csvContent)
}))

app.post('/merge-bases-locales', w(async (req, res) => {
  const {codeCommune, nom, communesDeleguees, basesLocales} = req.body

  if (!codeCommune) {
    throw createHttpError(400, 'Le champ code commune n’est pas renseigné. Il doit indiquer le code de la commune nouvelle')
  }

  if (!nom) {
    throw createHttpError(400, 'Le champ nom n’est pas renseigné')
  }

  const communesDelegueesCount = communesDeleguees?.length || 0
  const basesLocalesCount = basesLocales?.length || 0
  if (basesLocalesCount + communesDelegueesCount < 2) {
    throw createHttpError(400, 'Pas assez de commune à fusionner')
  }

  if (communesDelegueesCount > 0) {
    for (const code of communesDeleguees) {
      if (code.length !== 5) {
        throw createHttpError(400, `Le code commune ${code} n’est pas valide`)
      }
    }
  }

  if (basesLocalesCount > 0) {
    for (const id of basesLocales) {
      const baseLocale = await BaseLocale.fetchOne(id) // eslint-disable-line no-await-in-loop
      if (!baseLocale) {
        throw createHttpError(404, `Aucune base locale trouvée pour l’identifiant ${id}`)
      }
    }
  }

  const baseLocale = await BaseLocale.createBaseLocaleFromCommunesMerge(req.body)

  res.status(201).send(baseLocale)
}))

module.exports = app
