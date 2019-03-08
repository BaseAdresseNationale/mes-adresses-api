# API Bases Adresse Locales

API permettant la gestion de bases d’adresses à l’échelon local

## Pré-requis

- [Node.js](https://nodejs.org) 10+
- [yarn](https://www.yarnpkg.com)
- [MongoDB](https://www.mongodb.com) 4+

## Configuration

Cette application utilise des variables d'environnement pour sa configuration.
Elles peuvent être définies classiquement ou en créant un fichier `.env` sur la base du modèle `.env.sample`.

| Nom de la variable | Description |
| --- | --- |
| `MONGODB_URL` | Paramètre de connexion à MongoDB |
| `MONGODB_DBNAME` | Nom de la base de données à utiliser |
| `PORT` | Port à utiliser pour l'API |

Toutes ces variables ont des valeurs par défaut que vous trouverez dans le fichier `.env.sample`.

## Licence

MIT
