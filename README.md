# Mes Adresses API

Mes adresses api est un dispositif logiciel composé de deux application

- API: permettant la gestion de bases d’adresses à l’échelon local coupler avec [Mes adresses](https://github.com/BaseAdresseNationale/mes-adresses)
- CRON: permettant le deploiement continue des BALs de mes-adresses-api vers [Api de depot](https://github.com/BaseAdresseNationale/api-depot)

## 📚 Documentation

Une documentation plus complète et des guides d’utilisation sont disponibles dans le [Wiki](https://github.com/BaseAdresseNationale/mes-adresses-api/wiki).

## Pré-requis

- [Node.js](https://nodejs.org) 22
- [yarn](https://www.yarnpkg.com)
- [PostgresSQL](https://www.postgresql.org/)

### Postgres

Le base de donnée postgres doit avoir l'extension postgis d'installé

```
CREATE EXTENSION postgis
```

## Utilisation

### Installation

Installation des dépendances Node.js

```
yarn
```

Créer les variables d'environnement

```bash
cp .env.sample .env
```

On pourra ensuite éditer les variables d'environnement dans le fichier `.env` si nécessaire.

### Développement

Lancer l'api de développement :

```
$ yarn dev:api
```

Lancer le cron de développement :

```
$ yarn dev:cron
```

### Production

Créer une version de production :

```
$ yarn build
```

Démarrer l'api (port 3000 par défaut) :

```
$ yarn start:api
```

Démarrer le cron :

```
$ yarn start:cron
```

### Mise a jour

Mettre a jour les liste des communes (code insee) qui ont un cadastre

```
yarn update-cadastre
```

Mettre a jour les liste des communes nouvelles avec leurs communes anciennes

```
yarn update-communes
```

### Test

Rapport des tests (jest) :

```
$ yarn test
```

### Linter

Rapport du linter (eslint) :

```
$ yarn lint
```

## Configuration

Cette application utilise des variables d'environnement pour sa configuration.
Elles peuvent être définies classiquement ou en créant un fichier `.env` sur la base du modèle `.env.sample`.

| Nom de la variable                  | Description                                                                 |
| ----------------------------------- | --------------------------------------------------------------------------- |
| `POSTGRES_URL`                      | Url de connection a la db postgres                                          |
| `REDIS_URL`                         | Url de connection a redis                                                   |
| `PORT`                              | Port à utiliser pour l'API                                                  |
| `API_URL`                           | URL de base de l’API                                                        |
| `API_DEPOT_URL`                     | URL de l'api-depot                                                          |
| `API_DEPOT_CLIENT_ID`               | Id du client de l'api-depot                                                 |
| `API_DEPOT_CLIENT_SECRET`           | Token du client de l'api-depot                                              |
| `EDITOR_URL_PATTERN`                | Pattern permettant de construire l'URL vers l'édition d'une BAL             |
| `BAN_API_URL`                       | URL de ban-plateform                                                        |
| `API_SIGNALEMENT_URL`               | URL de l'API Signalement                                                    |
| `API_SIGNALEMENT_CLIENT_SECRET`     | Secret du client de l'API Signalement                                       |
| ---                                 | ---                                                                         |
| `SMTP_HOST`                         | Nom d'hôte du serveur SMTP                                                  |
| `SMTP_PORT`                         | Port du serveur SMTP                                                        |
| `SMTP_USER`                         | Nom d'utilisateur pour se connecter au serveur SMTP                         |
| `SMTP_PASS`                         | Mot de passe pour se connecter au serveur SMTP                              |
| `SMTP_SECURE`                       | Indique si le serveur SMTP nécessite une connexion sécurisée (`YES`)        |
| `SMTP_FROM`                         | Adresse à utiliser en tant qu'expéditeur des emails                         |
| `SMTP_BCC`                          | Adresse(s) en copie cachée à utiliser pour tous les envois de notifications |
| ---                                 | ---                                                                         |
| `S3_ENDPOINT`                       | URL de base du serveur S3                                                   |
| `S3_REGION`                         | région du S3                                                                |
| `S3_CONTAINER_ID`                   | Id du container S3                                                          |
| `S3_USER`                           | User S3                                                                     |
| `S3_ACCESS_KEY`                     | Clef d'accès S3                                                             |
| `S3_SECRET_KEY`                     | Clef secrete S3                                                             |
| `EXPORT_FILAIRES_DE_VOIE_FILE_NAME` | Nom de l'export des filaires de voie                                        |

Toutes ces variables ont des valeurs par défaut que vous trouverez dans le fichier `.env.sample`.

## Gouvernance

Ce outil a été conçu à l'initiative d'Etalab. Il est depuis 2020 piloté conjointement par Etalab et l'ANCT.

## Licence

MIT
