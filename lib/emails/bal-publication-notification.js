const {template} = require('lodash')
const {getEditorUrl, getApiUrl} = require('./util')

const bodyTemplate = template(`
<!DOCTYPE html>
<html lang="fr">

<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Publication de votre Base Adresse Locale</title>
  <style>
    body {
      background-color: #F5F6F7;
      color: #234361;
      font-family: "SF UI Text", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
      margin: auto;
      padding: 25px;
    }

    a {
      text-decoration: none;
    }

    button {
      background-color: #003b80;
      border: none;
      border-radius: 3px;
      padding: 10px;
    }

    img {
      max-height: 45px;
      background-color: #F5F6F7;
    }

    .bal {
      font-size: 25px;
      font-weight: bold;
    }

    .container {
      background-color: #ebeff3;
      padding: 25px;
    }

    .forceWhiteLink button a {
      color:#FFF!important;
    }

    .infos {
      margin-top: 35px;
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
  </style>
</head>

<body>
  <div>
    <img src="<%= apiUrl %>/public/images/logo-adresse.png" alt="Logo République Française">
  </div>
  <div class="title">
    <h2 style="margin:0; mso-line-height-rule:exactly;">Félicitations !</h2><br>
    <h3 style="margin:0; mso-line-height-rule:exactly;">Votre Base Adresse Locale est désormais publiée !</h3>
  </div>

  <div class="container">
    <section>
      <h4>✨ Un réel bénéfice pour votre commune</h4>
      <p>Les adresses de votre commune sont maintenant à jour et viennent alimenter <b>les référentiels nationaux</b>.</p>
      <p>Il est désormais plus simple pour vos administrés d'être&nbsp;:</p>
      <ul>
        <li>déclarés auprès des fournisseurs d'eau et d'énergies ⚡️</li>
        <li>éligibles à la fibre 🖥</li>
        <li>livrés 📦</li>
        <li>ou même secourus 🚑</li>
      </ul>
    </section>

    <section>
      <h4>🔍 Où consulter vos adresses ?</h4>
      <p>
        Vos adresses seront intégrées à la Base Adresse Nationale et disponibles d’ici <b>quelques heures</b>.<br />
        Elles seront consultables directement depuis notre <b>carte interactive</b> ici&nbsp;:
      </p>
      <span class="forceWhiteLink"><button><a href="https://adresse.data.gouv.fr/base-adresse-nationale/<%= codeCommune %>" target="blank">Consulter la Base Adresse Nationale</a></button></span>
      <p>
        Vous pourrez suivre l'état de vos adresses sur la page d'information par commune et télécharger la Base Adresse Nationale de votre commune ici&nbsp;:
      </p>
      <span class="forceWhiteLink"><button><a href="https://adresse.data.gouv.fr/commune/<%= codeCommune %>" target="blank">Consulter ma page commune</a></button></span>
    </section>

    <section>
      <h4>🚀 Continuez l’édition de cette Base Adresse Locale</h4>
      <p>
        Si vous souhaitez <b>mettre à jour</b> vos adresses ou effecter des <b>corrections</b>, continuer simplement l’édition de cette Base Adresse Locale.<br />
        Les changements seront <b>enregistrés automatiquement</b> et transmis à la Base Adresse Nationale.
      </p>

      <p>Vous pouvez continuer l’adressage de votre <b><i>Base Adresse Locale</i></b> ici&nbsp;: </p>
      <span class="forceWhiteLink"><button><a href="<%= editorUrl %>" target="blank">Gérer mes adresses</a></button></span>
    </section>

    <section>
      <h4>🇫🇷 Vous n’êtes pas seul</h4>
      <p>
        <b>Tous les jours</b> de nouvelles Bases Adresse Locales viennent alimenter la Base Adresse Nationale comme vous venez de le faire.<br />
        Découvrez l’état du <b>déploiement des Bases Adresse Locales à l’échelle nationale</b> ici&nbsp;:
      </p>
      <span class="forceWhiteLink"><button><a href="https://adresse.data.gouv.fr/deploiement-bal" target="blank">Carte de couverture des BAL</a></button></span>
    </section>
  </div>
</body>

  <footer>
    <p>En cas de problème, l'accès à la <b><i>Base Adresse Locale</i></b> peut être réinitialisé sur demande.</p>

    <span><i>L’équipe adresse.data.gouv.fr</i></span>
    <p class="infos">
      <small>
        <i>Jeton d’administration (information expert)&nbsp;: <%= baseLocale.token %></i>
      </small>
      <div>Si le bouton ci-dessus ne fonctionne pas, collez l’URL suivante dans la barre d’adresse de votre navigateur : <b><%= editorUrl %></b></div>
    </p>
  </footer>
</html>
`)

function formatEmail(data) {
  const {baseLocale} = data
  const editorUrl = getEditorUrl(baseLocale)
  const apiUrl = getApiUrl()
  const [codeCommune] = baseLocale.communes

  return {
    subject: 'Publication de votre Base Adresse Locale',
    html: bodyTemplate({baseLocale, codeCommune, editorUrl, apiUrl})
  }
}

module.exports = formatEmail
