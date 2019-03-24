const {template} = require('lodash')
const {getEditorUrl} = require('./util')

const bodyTemplate = template(`
Bonjour,

Félicitations, vous venez de créer une nouvelle Base Adresse Locale !

Nom de la Base Adresse Locale : <%= baseLocale.nom || 'non renseigné' %>
Jeton d’administration (information expert) : <%= baseLocale.token %>

Vous pouvez dès maintenant administrer votre Base Adresse Locale à partir de la page suivante :
<%= editorUrl %>

N'hésitez pas à faire suivre ce courriel à toute personne de confiance qui pourrait être amenée à intervenir sur les adresses.

En cas de problème, l'accès à la Base Adresse Locale peut être réinitialisé sur demande.

L’équipe adresse.data.gouv.fr
`)

function formatEmail(data) {
  const {baseLocale} = data
  const editorUrl = getEditorUrl(baseLocale)

  return {
    subject: 'Création d’une nouvelle Base Adresse Locale',
    text: bodyTemplate({baseLocale, editorUrl})
  }
}

module.exports = formatEmail
