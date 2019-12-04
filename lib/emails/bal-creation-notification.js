const {template} = require('lodash')
const {getEditorUrl, getApiUrl} = require('./util')

const bodyTemplate = template(`
<!DOCTYPE html>
<html lang="fr">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <title>Création d’une nouvelle Base Adresse Locale</title>
  <style>
    body {
      background-color: #F5F6F7;
      color: #234361;
      font-family: "SF UI Text", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
      margin: auto;
      padding: 25px;
    }

    a {
      color: white;
      text-decoration: none;
    }

    button {
      background-color: #0053b3;
      border: none;
      border-radius: 3px;
      padding: 10px;
    }

    .banTitle {
      font-size: 25px;
      font-weight: lighter;
      margin: 16px;
    }

    img {
      background-color: white;
      height: 65px;
      padding-right: 5px;
    }

    .bal {
      font-size: 25px;
      font-weight: bold;
    }

    .banner {
      background-color: #0053b3;
      border-radius: 2px;
      color: white;
      display: flex;
      justify-content: space-between;
    }

    .container {
      background-color: #ebeff3;
      padding: 25px;
    }

    .infos {
      margin-top: 35px;
    }

    .title {
      align-items: center;
      border-bottom: 1px solid #E4E7EB;
      display: flex;
      flex-direction: column;
      justify-content: center;
      min-height: 15em;
      padding: 10px;
      text-align: center;
    }
  </style>
</head>

<body>
  <div class="banner">
    <img src="<%= apiUrl %>/public/images/logo-marianne.svg" alt="Logo République Française">
    <span class="banTitle">adresse.data.gouv.fr</span>
  </div>
  <div class="title">
    <h2>Félicitations !</h2>
    <h3>Vous venez de créer une nouvelle Base Adresse Locale !</h3>
  </div>

  <div class="container">
    <p><b>Nom de la Base Adresse Locale&nbsp;: </b><%= baseLocale.nom || 'non renseigné' %></p>
    
    <p>Vous pouvez dès maintenant administrer votre <b><i>Base Adresse Locale</i></b> à partir de la page suivante:</p>
    <button><a href="<%= editorUrl %>" target="blank">Gérer mes adresses</a></button>
    <p>N'hésitez pas à faire suivre ce courriel à toute personne de confiance qui pourrait être amenée à intervenir sur les adresses.</p>
    <p>En cas de problème, l'accès à la <b><i>Base Adresse Locale</i></b> peut être réinitialisé sur demande.</p>
      
    <span><i>L’équipe adresse.data.gouv.fr</i></span>
    <p class="infos"><small><i>Jeton d’administration (information expert)&nbsp;: <%= baseLocale.token %></i></small></p>
  </div>
</body>

</html>
`)

function formatEmail(data) {
  const {baseLocale} = data
  const editorUrl = getEditorUrl(baseLocale)
  const apiUrl = getApiUrl()

  return {
    subject: 'Création d’une nouvelle Base Adresse Locale',
    html: bodyTemplate({baseLocale, editorUrl, apiUrl})
  }
}

module.exports = formatEmail
