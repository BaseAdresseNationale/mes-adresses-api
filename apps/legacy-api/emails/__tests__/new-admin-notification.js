const test = require('ava')
const formatEmail = require('../new-admin-notification')

test('formatEmail', t => {
  const baseLocale = {
    _id: '42',
    token: '123456',
    nom: 'test'
  }

  const expectedTextBody = `
<!DOCTYPE html>
<html lang="fr">

<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation à l‘administration d‘une Base Adresse Locale</title>
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
    <img src="http://api.domain.tld/public/images/logo-adresse.png" alt="Logo République Française">
  </div>
  <div class="title">
    <h3 style="margin:0; mso-line-height-rule:exactly;">Vous êtes invité à participer à l'édition de la Base Adresse Locale:</h3><br>
    <span class="bal">test</span>
  </div>

  <div class="container">

    <p>Vous pouvez dès maintenant administrer la <b>Base Adresse Locale</b> à partir de la page
      suivante&nbsp;: </p>
    <span class="forceWhiteLink"><button><a href="http://editor.domain.tld/42/123456" target="blank">Gérer mes adresses</a></button></span>

    <p>En cas de problème, l'accès à la <b><i>Base Adresse Locale</i></b> peut être réinitialisé sur demande.</p>

    <p><i>L’équipe adresse.data.gouv.fr</i></p>
    <p class="infos">
      <small>
        <i>Nouveau jeton (information expert)&nbsp;: 123456</i>
      </small>
      <div>Si le bouton ci-dessus ne fonctionne pas, collez l’URL suivante dans la barre d’adresse de votre navigateur : <b>http://editor.domain.tld/42/123456</b></div>
    </p>
  </div>
</body>

</html>
`

  t.is(formatEmail({baseLocale}).html, expectedTextBody)
})

test('formatEmail / without nom', t => {
  const baseLocale = {
    _id: '42',
    token: '123456'
  }

  const expectedTextBody = `
<!DOCTYPE html>
<html lang="fr">

<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation à l‘administration d‘une Base Adresse Locale</title>
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
    <img src="http://api.domain.tld/public/images/logo-adresse.png" alt="Logo République Française">
  </div>
  <div class="title">
    <h3 style="margin:0; mso-line-height-rule:exactly;">Vous êtes invité à participer à l'édition de la Base Adresse Locale:</h3><br>
    <span class="bal">non renseigné</span>
  </div>

  <div class="container">

    <p>Vous pouvez dès maintenant administrer la <b>Base Adresse Locale</b> à partir de la page
      suivante&nbsp;: </p>
    <span class="forceWhiteLink"><button><a href="http://editor.domain.tld/42/123456" target="blank">Gérer mes adresses</a></button></span>

    <p>En cas de problème, l'accès à la <b><i>Base Adresse Locale</i></b> peut être réinitialisé sur demande.</p>

    <p><i>L’équipe adresse.data.gouv.fr</i></p>
    <p class="infos">
      <small>
        <i>Nouveau jeton (information expert)&nbsp;: 123456</i>
      </small>
      <div>Si le bouton ci-dessus ne fonctionne pas, collez l’URL suivante dans la barre d’adresse de votre navigateur : <b>http://editor.domain.tld/42/123456</b></div>
    </p>
  </div>
</body>

</html>
`

  t.is(formatEmail({baseLocale}).html, expectedTextBody)
})
