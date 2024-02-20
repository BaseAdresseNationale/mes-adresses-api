# API Bases Adresse Locales

API permettant la gestion de bases d’adresses à l’échelon local

[![codecov](https://badgen.net/codecov/c/github/etalab/api-bal)](https://codecov.io/gh/etalab/api-bal)
[![XO code style](https://badgen.net/badge/code%20style/XO/cyan)](https://github.com/xojs/xo)

## Documentation

➡️ [Accéder à la documentation de l'API](https://github.com/etalab/api-bal/wiki/Documentation-de-l'API)

## Pré-requis

- [Node.js](https://nodejs.org) 16+
- [yarn](https://www.yarnpkg.com)
- [MongoDB](https://www.mongodb.com) 4+

## Utilisation

### Installation

```
yarn
```

### Démarrer le service

```
yarn start
```

### Lancer les tests

```
yarn test
```

## Mise a jour

### Cadastres des communes

```
yarn update-cadastre
```

## Configuration

Cette application utilise des variables d'environnement pour sa configuration.
Elles peuvent être définies classiquement ou en créant un fichier `.env` sur la base du modèle `.env.sample`.

| Nom de la variable        | Description                                                                 |
| --------------------------| --------------------------------------------------------------------------- |
| `MONGODB_URL`             | Paramètre de connexion à MongoDB                                            |
| `MONGODB_DBNAME`          | Nom de la base de données à utiliser                                        |
| `MONGODB_CERTIFICATE`     | Certificat pour les db mongo qui le demande                                 |
| `PORT`                    | Port à utiliser pour l'API                                                  |
| `SMTP_HOST`               | Nom d'hôte du serveur SMTP                                                  |
| `SMTP_PORT`               | Port du serveur SMTP                                                        |
| `SMTP_USER`               | Nom d'utilisateur pour se connecter au serveur SMTP                         |
| `SMTP_PASS`               | Mot de passe pour se connecter au serveur SMTP                              |
| `SMTP_SECURE`             | Indique si le serveur SMTP nécessite une connexion sécurisée (`YES`)        |
| `SMTP_FROM`               | Adresse à utiliser en tant qu'expéditeur des emails                         |
| `SMTP_BCC`                | Adresse(s) en copie cachée à utiliser pour tous les envois de notifications |
| `SHOW_EMAILS`             | Indique si les courriels doivent être affichés dans les logs (`YES`)        |
| `API_URL`                 | URL de base de l’API                                                        |
| `API_DEPOT_URL`           | URL de l'api-depot                                                          |
| `API_DEPOT_CLIENT_ID`     | Id du client de l'api-depot                                                 |
| `API_DEPOT_CLIENT_SECRET` | Token du client de l'api-depot                                              |
| `EDITOR_URL_PATTERN`      | Pattern permettant de construire l'URL vers l'édition d'une BAL             |

Toutes ces variables ont des valeurs par défaut que vous trouverez dans le fichier `.env.sample`.

## Licence

MIT
