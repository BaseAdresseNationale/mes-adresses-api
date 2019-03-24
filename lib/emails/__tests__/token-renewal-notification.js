const test = require('ava')
const formatEmail = require('../token-renewal-notification')

test('formatEmail', t => {
  const baseLocale = {
    _id: '42',
    token: '123456',
    nom: 'test'
  }

  const expectedTextBody = `
Bonjour,

Conformément à votre demande, le jeton d’administration de votre Base Adresse Locale a été renouvelé.
L’ancien jeton a été révoqué.

Nom de la Base Adresse Locale : test
Nouveau jeton : 123456

Vous pouvez désormais administrer votre Base Adresse Locale à partir de la page suivante :
http://editor.domain.tld/42/123456

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

Conformément à votre demande, le jeton d’administration de votre Base Adresse Locale a été renouvelé.
L’ancien jeton a été révoqué.

Nom de la Base Adresse Locale : non renseigné
Nouveau jeton : 123456

Vous pouvez désormais administrer votre Base Adresse Locale à partir de la page suivante :
http://editor.domain.tld/42/123456

L’équipe adresse.data.gouv.fr
`

  t.is(formatEmail({baseLocale}).text, expectedTextBody)
})

