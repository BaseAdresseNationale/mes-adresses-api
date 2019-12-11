const test = require('ava')
const formatEmail = require('../bal-publication-notification')

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
    <h2 style="margin:0; mso-line-height-rule:exactly;">Félicitations !</h2><br>
    <h3 style="margin:0; mso-line-height-rule:exactly;">Votre Base Adresse Locale est désormais publiée !</h3>
  </div>

  <div class="container">
    <p>Les adresses de votre commune sont maintenant à jour et viennent alimenter les référentiels nationaux.</p>
    <p>Il est désormais plus simple pour vos administrés d'être&nbsp;:</p>
    <ul>
      <li>déclarés auprès des fournisseurs d'eau et d'énergies</li>
      <li>éligibles à la fibre</li>
      <li>livrés</li>
      <li>ou même secourus</li>
    </ul>
    
    <p>Vous pouvez consulter votre <b><i>Base Adresse Locale</i></b> ici&nbsp;: </p>
    <button><a href="http://editor.domain.tld/42/123456" target="blank">Gérer mes adresses</a></button>

    <p>Et découvrir l'état du déploiement des <b><i>Bases Adresses Locales</i></b> ici&nbsp;: </p>
    <button><a href="https://adresse.data.gouv.fr/bases-locales" target="blank">Bases Adresses Locales</a></button>

    <p><i>Si vous souhaitez la mettre à jour, il vous suffit de l‘éditer et les changements seront appliqués automatiquement d‘ici quelques jours.</i></p>

    <p>En cas de problème, l'accès à la <b><i>Base Adresse Locale</i></b> peut être réinitialisé sur demande.</p>
      
    <span><i>L’équipe adresse.data.gouv.fr</i></span>
    <p class="infos"><small><i>Jeton d’administration (information expert)&nbsp;: 123456</i></small></p>
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
    <h2 style="margin:0; mso-line-height-rule:exactly;">Félicitations !</h2><br>
    <h3 style="margin:0; mso-line-height-rule:exactly;">Votre Base Adresse Locale est désormais publiée !</h3>
  </div>

  <div class="container">
    <p>Les adresses de votre commune sont maintenant à jour et viennent alimenter les référentiels nationaux.</p>
    <p>Il est désormais plus simple pour vos administrés d'être&nbsp;:</p>
    <ul>
      <li>déclarés auprès des fournisseurs d'eau et d'énergies</li>
      <li>éligibles à la fibre</li>
      <li>livrés</li>
      <li>ou même secourus</li>
    </ul>
    
    <p>Vous pouvez consulter votre <b><i>Base Adresse Locale</i></b> ici&nbsp;: </p>
    <button><a href="http://editor.domain.tld/42/123456" target="blank">Gérer mes adresses</a></button>

    <p>Et découvrir l'état du déploiement des <b><i>Bases Adresses Locales</i></b> ici&nbsp;: </p>
    <button><a href="https://adresse.data.gouv.fr/bases-locales" target="blank">Bases Adresses Locales</a></button>

    <p><i>Si vous souhaitez la mettre à jour, il vous suffit de l‘éditer et les changements seront appliqués automatiquement d‘ici quelques jours.</i></p>

    <p>En cas de problème, l'accès à la <b><i>Base Adresse Locale</i></b> peut être réinitialisé sur demande.</p>
      
    <span><i>L’équipe adresse.data.gouv.fr</i></span>
    <p class="infos"><small><i>Jeton d’administration (information expert)&nbsp;: 123456</i></small></p>
  </div>
</body>

</html>
`

  t.is(formatEmail({baseLocale}).html, expectedTextBody)
})
