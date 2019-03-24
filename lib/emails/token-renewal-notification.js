const {template} = require('lodash')
const {getEditorUrl} = require('./util')

const bodyTemplate = template(`
Bonjour,

Conformément à votre demande, le jeton d’administration de votre Base Adresse Locale a été renouvelé.
L’ancien jeton a été révoqué.

Nom de la Base Adresse Locale : <%= baseLocale.nom || 'non renseigné' %>
Nouveau jeton : <%= baseLocale.token %>

Vous pouvez désormais administrer votre Base Adresse Locale à partir de la page suivante :
<%= editorUrl %>

L’équipe adresse.data.gouv.fr
`)

function formatEmail(data) {
  const {baseLocale} = data
  const editorUrl = getEditorUrl(baseLocale)

  return {
    subject: 'Renouvelement de jeton de Base Adresse Locale',
    text: bodyTemplate({baseLocale, editorUrl})
  }
}

module.exports = formatEmail
