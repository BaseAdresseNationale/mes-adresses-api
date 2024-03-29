const test = require('ava')
const formatEmail = require('../recovery-notification')

test('formatEmail - list of BAL', t => {
  const basesLocales = [
    {
      _id: '21',
      token: '123456',
      status: 'draft',
      nom: 'BAL A'
    },
    {
      _id: '42',
      token: '789100',
      status: 'ready-to-publish',
      nom: 'BAL B'
    },
    {
      _id: '84',
      token: '424242',
      status: 'published',
      nom: 'BAL C'
    },
    {
      _id: '168',
      _deleted: new Date('2022-02-02'),
      token: '424242',
      status: 'draft',
      nom: 'BAL D'
    },
    {
      _id: '336',
      _deleted: new Date('2022-02-03'),
      token: '424242',
      status: 'draft',
      nom: 'BAL E'
    }
  ]

  const expectedTextBody = `
<!DOCTYPE html>
<html lang="fr">

<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Demande de récupération de vos Bases Adresses Locales</title>
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

    .replaced {
      background-color: rgb(212, 238, 226);
      color: rgb(120, 120, 62);
    }

    .explaination {
      font-size: small;
    }

    .signature {
      margin-top: 40px;
    }
  </style>
</head>

<body>
  <div>
    <img src="http://api.domain.tld/public/images/logo-adresse.png" alt="Logo République Française">
  </div>
  <div class="title">
    <h2 style="margin:0; mso-line-height-rule:exactly;">Demande de récupération de vos Bases Adresses Locales</h2><br>
    <h3 style="margin:0; mso-line-height-rule:exactly;">Cliquez sur le lien associé pour récupérer une Base Adresse Locale</h3>
  </div>

  <div class="container">
    <h3>Liste des Bases Adresses Locales associées à votre adresse email :</h3>
    <ul>
      <li><span class="status draft">Brouillon</span> BAL A : <a href="http://editor.domain.tld/21/123456">http://editor.domain.tld/21/123456</a></li><li><span class="status ready-to-publish">Prête à être publiée</span> BAL B : <a href="http://editor.domain.tld/42/789100">http://editor.domain.tld/42/789100</a></li><li><span class="status published">Publiée</span> BAL C : <a href="http://editor.domain.tld/84/424242">http://editor.domain.tld/84/424242</a></li>
    </ul>
    <h3>Liste des Bases Adresses Locales supprimées, associées à votre adresse email :</h3>
    <ul>
      <li><span class="status draft">Supprimée le 02/02/2022</span> BAL D : <a href="http://api.domain.tld/v1/bases-locales/168/424242/recovery">http://api.domain.tld/v1/bases-locales/168/424242/recovery</a></li><li><span class="status draft">Supprimée le 03/02/2022</span> BAL E : <a href="http://api.domain.tld/v1/bases-locales/336/424242/recovery">http://api.domain.tld/v1/bases-locales/336/424242/recovery</a></li>
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
`

  t.is(formatEmail({basesLocales}).html, expectedTextBody)
})

test('formatEmail - only one BAL', t => {
  const basesLocales = [
    {
      _id: '21',
      token: '123456',
      status: 'draft',
      nom: 'BAL A'
    }
  ]

  const expectedTextBody = `
<!DOCTYPE html>
<html lang="fr">

<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Demande de récupération de vos Bases Adresses Locales</title>
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

    .replaced {
      background-color: rgb(212, 238, 226);
      color: rgb(120, 120, 62);
    }

    .explaination {
      font-size: small;
    }

    .signature {
      margin-top: 40px;
    }
  </style>
</head>

<body>
  <div>
    <img src="http://api.domain.tld/public/images/logo-adresse.png" alt="Logo République Française">
  </div>
  <div class="title">
    <h2 style="margin:0; mso-line-height-rule:exactly;">Demande de récupération de votre Base Adresse Locale</h2><br>
    <h3 style="margin:0; mso-line-height-rule:exactly;">Cliquez sur le lien associé pour récupérer votre Base Adresse Locale</h3>
  </div>

  <div class="container">
    <ul>
      <li><span class="status draft">Brouillon</span> BAL A : <a href="http://editor.domain.tld/21/123456">http://editor.domain.tld/21/123456</a></li>
    </ul>

    <h5>Pourquoi ce courriel vous est envoyé ?</h5>
    <p class="explaination">
      Une personne souhaite récupérer l’accès à sa Base Adresse Locale et a communiquée cette adresse de courrier électronique.
      Si vous n'êtes pas à l'origine de cette demande, merci d'ignorer ce courriel.
    </p>

    <div class="signature"><i>L’équipe adresse.data.gouv.fr</i></div>
  </div>
</body>

</html>
`

  t.is(formatEmail({basesLocales}).html, expectedTextBody)
})

test('formatEmail - only one BAL deleted', t => {
  const basesLocales = [
    {
      _id: '21',
      _deleted: new Date('2022-02-02'),
      token: '123456',
      status: 'draft',
      nom: 'BAL A'
    }
  ]

  const expectedTextBody = `
<!DOCTYPE html>
<html lang="fr">

<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Demande de récupération de vos Bases Adresses Locales</title>
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

    .replaced {
      background-color: rgb(212, 238, 226);
      color: rgb(120, 120, 62);
    }

    .explaination {
      font-size: small;
    }

    .signature {
      margin-top: 40px;
    }
  </style>
</head>

<body>
  <div>
    <img src="http://api.domain.tld/public/images/logo-adresse.png" alt="Logo République Française">
  </div>
  <div class="title">
    <h2 style="margin:0; mso-line-height-rule:exactly;">Demande de récupération de votre Base Adresse Locale</h2><br>
    <h3 style="margin:0; mso-line-height-rule:exactly;">Cliquez sur le lien associé pour récupérer votre Base Adresse Locale</h3>
  </div>

  <div class="container">
    <ul>
      <li><span class="status draft">Supprimée le 02/02/2022</span> BAL A : <a href="http://api.domain.tld/v1/bases-locales/21/123456/recovery">http://api.domain.tld/v1/bases-locales/21/123456/recovery</a></li>
    </ul>

    <h5>Pourquoi ce courriel vous est envoyé ?</h5>
    <p class="explaination">
      Une personne souhaite récupérer l’accès à sa Base Adresse Locale et a communiquée cette adresse de courrier électronique.
      Si vous n'êtes pas à l'origine de cette demande, merci d'ignorer ce courriel.
    </p>

    <div class="signature"><i>L’équipe adresse.data.gouv.fr</i></div>
  </div>
</body>

</html>
`

  t.is(formatEmail({basesLocales}).html, expectedTextBody)
})
