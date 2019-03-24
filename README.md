# API Bases Adresse Locales [![CircleCI](https://circleci.com/gh/etalab/api-bal/tree/master.svg?style=svg)](https://circleci.com/gh/etalab/api-bal/tree/master)

API permettant la gestion de bases d’adresses à l’échelon local

[![npm version](https://badgen.net/npm/v/@etalab/api-bal)](https://www.npmjs.com/package/@etalab/api-bal)
[![dependencies Status](https://david-dm.org/etalab/api-bal/status.svg)](https://david-dm.org/etalab/api-bal)
[![codecov](https://badgen.net/codecov/c/github/etalab/api-bal)](https://codecov.io/gh/etalab/api-bal)
[![XO code style](https://badgen.net/badge/code%20style/XO/cyan)](https://github.com/xojs/xo)

## Documentation

➡️ [Accéder à la documentation de l'API](https://github.com/etalab/api-bal/wiki/Documentation-de-l'API)

## Pré-requis

- [Node.js](https://nodejs.org) 10+
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

## Configuration

Cette application utilise des variables d'environnement pour sa configuration.
Elles peuvent être définies classiquement ou en créant un fichier `.env` sur la base du modèle `.env.sample`.

| Nom de la variable | Description |
| --- | --- |
| `EDITOR_URL_PATTERN ` | Pattern permettant de construire l'URL vers l'édition d'une BAL |
| `MONGODB_URL` | Paramètre de connexion à MongoDB |
| `MONGODB_DBNAME` | Nom de la base de données à utiliser |
| `PORT` | Port à utiliser pour l'API |
| `SMTP_HOST` | Nom d'hôte du serveur SMTP |
| `SMTP_PORT` | Port du serveur SMTP |
| `SMTP_USER` | Nom d'utilisateur pour se connecter au serveur SMTP |
| `SMTP_PASS` | Mot de passe pour se connecter au serveur SMTP |
| `SMTP_SECURE` | Indique si le serveur SMTP nécessite une connexion sécurisée (`YES`) |
| `SMTP_SENDER` | Adresse à utiliser en tant qu'expéditeur des emails |
| `SHOW_EMAILS` | Indique si les courriels doivent être affichés dans les logs (`YES`) |

Toutes ces variables ont des valeurs par défaut que vous trouverez dans le fichier `.env.sample`.

## Docker

Il est possible d’executer cette application dans un conteneur Docker afin d’éviter d’avoir à installer toutes ses dépendances sur votre machine.

Le fichier `docker-compose.yml` crée les services suivants :
- Une base mongodb, non exposée
- L’API Bases Adresses Locales, exposée sur le port `5000`
- Un service Mongo Express, exposé sur le port `8081` (interface web à mongodb)

Pour démarrer les services, lancer

```
docker-compose up
```

L’image Docker de l’API est construite avec le fichier `Dockerfile`. Les modifications apportées au code ne seront pas détectées automatiquement, il est nécessaire de reconstruire l’image avec

```
docker-compose build
```

## Licence

MIT
