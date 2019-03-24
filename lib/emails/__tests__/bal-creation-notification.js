const test = require('ava')
const formatEmail = require('../bal-creation-notification')

test('formatEmail', t => {
  const baseLocale = {
    _id: '42',
    token: '123456',
    nom: 'test'
  }

  const expectedTextBody = `
Bonjour,

Félicitations, vous venez de créer une nouvelle Base Adresse Locale !

Nom de la Base Adresse Locale : test
Jeton d’administration (information expert) : 123456

Vous pouvez dès maintenant administrer votre Base Adresse Locale à partir de la page suivante :
http://editor.domain.tld/42/123456

N'hésitez pas à faire suivre ce courriel à toute personne de confiance qui pourrait être amenée à intervenir sur les adresses.

En cas de problème, l'accès à la Base Adresse Locale peut être réinitialisé sur demande.

L’équipe adresse.data.gouv.fr
`

  t.is(formatEmail({baseLocale}).text, expectedTextBody)
})

test('formatEmail / without nom', t => {
  const baseLocale = {
    _id: '42',
    token: '123456'
  }

  const expectedTextBody = `
Bonjour,

Félicitations, vous venez de créer une nouvelle Base Adresse Locale !

Nom de la Base Adresse Locale : non renseigné
Jeton d’administration (information expert) : 123456

Vous pouvez dès maintenant administrer votre Base Adresse Locale à partir de la page suivante :
http://editor.domain.tld/42/123456

N'hésitez pas à faire suivre ce courriel à toute personne de confiance qui pourrait être amenée à intervenir sur les adresses.

En cas de problème, l'accès à la Base Adresse Locale peut être réinitialisé sur demande.

L’équipe adresse.data.gouv.fr
`

  t.is(formatEmail({baseLocale}).text, expectedTextBody)
})
