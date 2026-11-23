import { MigrationInterface, QueryRunner } from 'typeorm';

export class IndexCommuneDropDeletedAt1795012405099
  implements MigrationInterface
{
  name = 'IndexCommuneDropDeletedAt1795012405099';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Index sur la commune : évite les seq scans de bases_locales
    // (recherche des BAL d'une commune, BAL synchronisée d'une commune…)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_bases_locales_commune" ON "bases_locales" ("commune")`,
    );

    // Index partiels sur deleted_at : non sélectifs (~96 % des lignes),
    // jamais utilisés (voies, toponymes) ou seulement en lecture complète (numeros, bases_locales)
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_7d845d3615a8694f9d53a9df21"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_a31fd9857f1bfdbd294b3a346e"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_934ff6f32b687f42142dbedf44"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_72ac99dc6e0935a571c3a772e6"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "IDX_72ac99dc6e0935a571c3a772e6" ON "bases_locales" ("deleted_at") WHERE deleted_at IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_934ff6f32b687f42142dbedf44" ON "toponymes" ("deleted_at") WHERE deleted_at IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a31fd9857f1bfdbd294b3a346e" ON "voies" ("deleted_at") WHERE deleted_at IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7d845d3615a8694f9d53a9df21" ON "numeros" ("deleted_at") WHERE deleted_at IS NULL`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_bases_locales_commune"`);
  }
}
