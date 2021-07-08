const {template} = require('lodash')
const {getEditorUrl, getApiUrl} = require('./util')

const head = `
<!DOCTYPE html>
<html lang="fr">

<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Demande de récupération de votre Base Adresse Locale</title>
  <style>
    body {
      background-color: #F5F6F7;
      color: #234361;
      font-family: "SF UI Text", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
      margin: auto;
      padding: 25px;
    }

    li {
      margin: 1em 0;
    }

    h5 {
      margin: 40px 0 0;
    }

    img {
      max-height: 45px;
      background-color: #F5F6F7;
    }

    .container {
      background-color: #ebeff3;
      padding: 25px;
    }

    .title {
      align-items: center;
      border-bottom: 1px solid #E4E7EB;
      justify-content: center;
      margin-top: 35px;
      min-height: 10em;
      padding: 10px;
      text-align: center;
    }

    .status {
      padding: .4em;
      border-radius: 4px;
    }

    .draft {
      background-color: rgb(228, 231, 235);
      color: rgb(66, 90, 112);
    }

    .ready-to-publish {
      background-color: rgb(221, 235, 247);
      color: rgb(8, 75, 138);
    }

    .published {
      background-color: rgb(212, 238, 226);
      color: rgb(0, 120, 62);
    }

    .explaination {
      font-size: small;
    }

    .signature {
      margin-top: 40px;
    }
  </style>
</head>
`

const bodyTemplateList = template(`
${head}

<body>
  <div>
    <img src="<%= apiUrl %>/public/images/logo-adresse.png" alt="Logo République Française">
  </div>
  <div class="title">
    <h2 style="margin:0; mso-line-height-rule:exactly;">Demande de récupération de vos Bases Adresses Locales</h2><br>
    <h3 style="margin:0; mso-line-height-rule:exactly;">Cliquez sur le lien associé pour récupérer une Base Adresse Locale</h3>
  </div>

  <div class="container">
    <h3>Liste des Bases Adresses Locales associées à votre adresse email :</h3>
    <ul>
      <% _.forEach(basesLocalesRevory, function(baseLocale) { %><li><span class="status <%- baseLocale.status %>"><%- baseLocale.statusFr %></span> <%- baseLocale.nom %> : <a href="<%- baseLocale.recoveryUrl %>"><%- baseLocale.recoveryUrl %></a></li><% }); %>
    </ul>

    <h5>Pourquoi ce courriel vous est envoyé ?</h5>
    <p class="explaination">
      Une personne souhaite récupérer l’accès à ses Bases Adresses Locales et a communiquée cette adresse de courrier électronique.
      Si vous n'êtes pas à l'origine de cette demande, merci d'ignorer ce courriel.
    </p>

    <div class="signature"><i>L’équipe adresse.data.gouv.fr</i></div>
  </div>
</body>

</html>
`)

const bodyTemplate = template(`
${head}

<body>
  <div>
    <img src="<%= apiUrl %>/public/images/logo-adresse.png" alt="Logo République Française">
  </div>
  <div class="title">
    <h2 style="margin:0; mso-line-height-rule:exactly;">Demande de récupération de votre Base Adresse Locale</h2><br>
    <h3 style="margin:0; mso-line-height-rule:exactly;">Cliquez sur le lien associé pour récupérer votre Base Adresse Locale</h3>
  </div>

  <div class="container">
    <ul>
      <li><span class="status <%- baseLocale.status %>"><%- baseLocale.statusFr %></span> <%- baseLocale.nom %> : <a href="<%- baseLocale.recoveryUrl %>"><%- baseLocale.recoveryUrl %></a></li>
    </ul>

    <h5>Pourquoi ce courriel vous est envoyé ?</h5>
    <p class="explaination">
      Une personne souhaite récupérer l’accès à ses Bases Adresses Locales et a communiquée cette adresse de courrier électronique.
      Si vous n'êtes pas à l'origine de cette demande, merci d'ignorer ce courriel.
    </p>

    <div class="signature"><i>L’équipe adresse.data.gouv.fr</i></div>
  </div>
</body>

</html>
`)

const STATUS = {
  draft: 'Brouillon',
  'ready-to-publish': 'Prête à être publiée',
  published: 'Publiée'
}

function formatEmail(data) {
  const {basesLocales} = data
  const apiUrl = getApiUrl()
  const basesLocalesRevory = basesLocales.map(baseLocale => {
    return {
      ...baseLocale,
      statusFr: STATUS[baseLocale.status],
      recoveryUrl: getEditorUrl(baseLocale)
    }
  })

  if (basesLocalesRevory.length === 1) {
    return {
      subject: 'Demande de récupération de votre Base Adresse Locale',
      html: bodyTemplate({baseLocale: basesLocalesRevory[0], apiUrl})
    }
  }

  return {
    subject: 'Demande de récupération de vos Bases Adresses Locales',
    html: bodyTemplateList({basesLocalesRevory, apiUrl})
  }
}

module.exports = formatEmail
