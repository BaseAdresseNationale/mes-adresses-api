# CLAUDE.md

Backend de l'éditeur mes-adresses : gestion des Bases Adresses Locales (base locale, voies, toponymes, numéros, positions) et publication automatique vers api-depot.

## Commandes

```bash
yarn                        # install (yarn uniquement)
cp .env.sample .env
yarn dev:api                # app API en watch
yarn dev:cron               # app cron en watch
yarn build                  # build api + cron
yarn lint                   # eslint --fix
yarn test                   # test:api + test:cron (e2e, testcontainers → Docker requis)
yarn test:api numero        # filtrer un fichier e2e de l'API
yarn typeorm:migration:run
yarn typeorm:migration:down
yarn typeorm migration:generate migrations/<nom> -d ./typeorm.config.ts
yarn generate:openapi:signalement   # client api-signalement (api-signalement doit tourner en local)
```

Node 24 (`engines`). Postgres avec extension **PostGIS** obligatoire. Redis pour BullMQ.

## Architecture (monorepo NestJS)

- `apps/api/` : API REST. Modules dans `apps/api/src/modules/` : `base_locale`, `voie`, `toponyme`, `numeros`, `signalement`, `stats`, `admin`.
- `apps/cron/` : `schedule_task/` planifie (`@Cron`) des jobs exécutés par `task/task.processor.ts` (BullMQ) — notamment la synchro/publication des BAL vers api-depot.
- `libs/shared/src/` : code partagé entre les deux apps
  - `entities/` : entités TypeORM (`base_locale`, `voie`, `toponyme`, `numero`, `position`, `cache`)
  - `modules/` : `api_depot`, `ban_plateform`, `publication`, `export_csv`, `s3`, `cache`, `logger`
  - `openapi-signalement/` : client généré, ne pas éditer à la main
- Alias : `@/modules/*`, `@/lib/*` → `apps/api/src/…` ; `@/shared/*` → `libs/shared/src/*`.

## Tests

E2E uniquement, dans `apps/api/test/*.e2e-spec.ts` et `apps/cron/test/` (config `jest-e2e.json`, helpers `typeorm.utils.ts`). Ils démarrent un Postgres via testcontainers : lents, Docker requis.

## Points d'attention

- `synchronize: false` : toute modif d'entité → migration dans `migrations/` (et entité déclarée dans `typeorm.config.ts`).
- Fichiers JSON de référence à la racine (`cadastre-communes.json`, `communes-precedentes-by-chef-lieu.json`) mis à jour par `yarn update-cadastre` / `yarn update-cog` — ne pas éditer à la main.
- Les contrats d'API sont consommés par mes-adresses (client OpenAPI généré dans `mes-adresses/src/lib/openapi-api-bal`) : un changement de DTO/route casse le front s'il n'est pas répercuté.
