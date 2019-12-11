const test = require('ava')
const formatEmail = require('../token-renewal-notification')

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
      text-decoration: none;
    }

    button {
      border: 1px solid #003189;
      background-color: #99bdff;
      border-radius: 3px;
      padding: 10px;
    }

    button a {
      color: #FFF;
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

    .infos {
      margin-top: 35px;
    }

    .title {
      align-items: center;
      border-bottom: 1px solid #E4E7EB;
      justify-content: center;
      margin-top: 35px;
      min-height: 15em;
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
    <h3 style="margin:0; mso-line-height-rule:exactly;">Conformément à votre demande,</h3><br>
    <h3 style="margin:0; mso-line-height-rule:exactly;">Le jeton d’administration de votre Base Adresse Locale a été renouvelé.</h3><br>
    <h4 style="margin:0; mso-line-height-rule:exactly;">L'ancien jeton a été révoqué.</h4>
  </div>

  <div class="container">
    <p><b>Nom de la Base Adresse Locale&nbsp;: </b>test</p>
    <p>Vous pouvez désormais administrer votre <b><i>Base Adresse Locale</i></b> à partir de la page suivante:</p>
    <button><a href="http://editor.domain.tld/42/123456" target="blank">Gérer mes adresses</a></button>
    <p><i>L’équipe adresse.data.gouv.fr</i></p>
    <p class="infos"><small><i>Nouveau jeton (information expert)&nbsp;: 123456</i></small></p>
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
      text-decoration: none;
    }

    button {
      border: 1px solid #003189;
      background-color: #99bdff;
      border-radius: 3px;
      padding: 10px;
    }

    button a {
      color: #FFF;
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

    .infos {
      margin-top: 35px;
    }

    .title {
      align-items: center;
      border-bottom: 1px solid #E4E7EB;
      justify-content: center;
      margin-top: 35px;
      min-height: 15em;
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
    <h3 style="margin:0; mso-line-height-rule:exactly;">Conformément à votre demande,</h3><br>
    <h3 style="margin:0; mso-line-height-rule:exactly;">Le jeton d’administration de votre Base Adresse Locale a été renouvelé.</h3><br>
    <h4 style="margin:0; mso-line-height-rule:exactly;">L'ancien jeton a été révoqué.</h4>
  </div>

  <div class="container">
    <p><b>Nom de la Base Adresse Locale&nbsp;: </b>non renseigné</p>
    <p>Vous pouvez désormais administrer votre <b><i>Base Adresse Locale</i></b> à partir de la page suivante:</p>
    <button><a href="http://editor.domain.tld/42/123456" target="blank">Gérer mes adresses</a></button>
    <p><i>L’équipe adresse.data.gouv.fr</i></p>
    <p class="infos"><small><i>Nouveau jeton (information expert)&nbsp;: 123456</i></small></p>
  </div>
</body>

</html>
`

  t.is(formatEmail({baseLocale}).html, expectedTextBody)
})

