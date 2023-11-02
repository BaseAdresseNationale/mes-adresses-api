import { template } from 'lodash';
import { getEditorUrl, getApiUrl } from '../mailer.utils';
import { Email } from '@/modules/base_locale/sub_modules/mailer/mailer.types';

const bodyTemplate = template(`
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
    <img src="<%= apiUrl %>/public/images/logo-adresse.png" alt="Logo République Française">
  </div>
  <div class="title">
    <h3 style="margin:0; mso-line-height-rule:exactly;">Vous êtes invité à participer à l'édition de la Base Adresse Locale:</h3><br>
    <span class="bal"><%= baseLocale.nom || 'non renseigné' %></span>
  </div>

  <div class="container">

    <p>Vous pouvez dès maintenant administrer la <b>Base Adresse Locale</b> à partir de la page
      suivante&nbsp;: </p>
    <span class="forceWhiteLink"><button><a href="<%= editorUrl %>" target="blank">Gérer mes adresses</a></button></span>

    <p>En cas de problème, l'accès à la <b><i>Base Adresse Locale</i></b> peut être réinitialisé sur demande.</p>

    <p><i>L’équipe adresse.data.gouv.fr</i></p>
    <p class="infos">
      <small>
        <i>Nouveau jeton (information expert)&nbsp;: <%= baseLocale.token %></i>
      </small>
      <div>Si le bouton ci-dessus ne fonctionne pas, collez l’URL suivante dans la barre d’adresse de votre navigateur : <b><%= editorUrl %></b></div>
    </p>
  </div>
</body>

</html>
`);

export function formatEmail({ baseLocale }): Email {
  const editorUrl = getEditorUrl(baseLocale);
  const apiUrl = getApiUrl();

  return {
    subject: 'Invitation à l‘administration d‘une Base Adresse Locale',
    html: bodyTemplate({ baseLocale, editorUrl, apiUrl }),
  };
}
