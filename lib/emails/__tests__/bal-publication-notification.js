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
    <h2>Félicitations !</h2>
    <h3>Votre Base Adresse Locale est désormais publiée !</h3>
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
    <h2>Félicitations !</h2>
    <h3>Votre Base Adresse Locale est désormais publiée !</h3>
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
