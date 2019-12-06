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
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
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
      background-color: #0053b3;
      border: none;
      border-radius: 3px;
      padding: 10px;
    }

    button a {
      color: #FFF
    }
    
    img {
      background-color: white;
      height: 65px;
      padding-right: 5px;
    }

    .banTitle {
      font-size: 25px;
      font-weight: lighter;
      margin: 16px;
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
    <img src="http://api.domain.tld/public/images/logo-marianne.svg" alt="Logo République Française">
    <span class="banTitle">adresse.data.gouv.fr</span>
  </div>
  <div class="title">
    <h3>Vous êtes invité à participer à l'édition de la Base Adresse Locale:</h3>
    <span class="bal">test</span>
  </div>

  <div class="container">
    
    <p>Vous pouvez dès maintenant particper à l'administration de votre <b>Base Adresse Locale</b> à partir de la page
      suivante&nbsp;: </p>
    <button><a href="http://editor.domain.tld/42/123456" target="blank">Gérer mes adresses</a></button>
      
    <p>En cas de problème, l'accès à la <b><i>Base Adresse Locale</i></b> peut être réinitialisé sur demande.</p>
      
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
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
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
      background-color: #0053b3;
      border: none;
      border-radius: 3px;
      padding: 10px;
    }

    button a {
      color: #FFF
    }
    
    img {
      background-color: white;
      height: 65px;
      padding-right: 5px;
    }

    .banTitle {
      font-size: 25px;
      font-weight: lighter;
      margin: 16px;
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
    <img src="http://api.domain.tld/public/images/logo-marianne.svg" alt="Logo République Française">
    <span class="banTitle">adresse.data.gouv.fr</span>
  </div>
  <div class="title">
    <h3>Vous êtes invité à participer à l'édition de la Base Adresse Locale:</h3>
    <span class="bal">non renseigné</span>
  </div>

  <div class="container">
    
    <p>Vous pouvez dès maintenant particper à l'administration de votre <b>Base Adresse Locale</b> à partir de la page
      suivante&nbsp;: </p>
    <button><a href="http://editor.domain.tld/42/123456" target="blank">Gérer mes adresses</a></button>
      
    <p>En cas de problème, l'accès à la <b><i>Base Adresse Locale</i></b> peut être réinitialisé sur demande.</p>
      
    <p><i>L’équipe adresse.data.gouv.fr</i></p>
    <p class="infos"><small><i>Nouveau jeton (information expert)&nbsp;: 123456</i></small></p>
  </div>
</body>

</html>
`

  t.is(formatEmail({baseLocale}).html, expectedTextBody)
})
