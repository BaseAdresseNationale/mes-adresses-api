import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveSoftDelete1784799394151 implements MigrationInterface {
  name = 'RemoveSoftDelete1784799394151';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // On détache les numéros actifs qui pointent encore vers un toponyme
    // soft-deleted, avant de purger ces toponymes (pas de cascade sur ce lien)
    await queryRunner.query(
      `UPDATE "numeros" SET "toponyme_id" = NULL WHERE "toponyme_id" IN (SELECT "id" FROM "toponymes" WHERE "deleted_at" IS NOT NULL)`,
    );
    // Purge des lignes soft-deleted (ordre enfant -> parent)
    await queryRunner.query(`DELETE FROM "numeros" WHERE "deleted_at" IS NOT NULL`);
    await queryRunner.query(`DELETE FROM "voies" WHERE "deleted_at" IS NOT NULL`);
    await queryRunner.query(`DELETE FROM "toponymes" WHERE "deleted_at" IS NOT NULL`);

    // Suppression des index partiels sur deleted_at
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7d845d3615a8694f9d53a9df21"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a31fd9857f1bfdbd294b3a346e"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_934ff6f32b687f42142dbedf44"`,
    );

    // Suppression des colonnes deleted_at
    await queryRunner.query(`ALTER TABLE "numeros" DROP COLUMN "deleted_at"`);
    await queryRunner.query(`ALTER TABLE "voies" DROP COLUMN "deleted_at"`);
    await queryRunner.query(`ALTER TABLE "toponymes" DROP COLUMN "deleted_at"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Les lignes purgées dans up() ne sont pas récupérables.
    await queryRunner.query(
      `ALTER TABLE "toponymes" ADD "deleted_at" TIMESTAMP`,
    );
    await queryRunner.query(`ALTER TABLE "voies" ADD "deleted_at" TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "numeros" ADD "deleted_at" TIMESTAMP`);

    await queryRunner.query(
      `CREATE INDEX "IDX_934ff6f32b687f42142dbedf44" ON "toponymes" ("deleted_at") WHERE deleted_at IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a31fd9857f1bfdbd294b3a346e" ON "voies" ("deleted_at") WHERE deleted_at IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7d845d3615a8694f9d53a9df21" ON "numeros" ("deleted_at") WHERE deleted_at IS NULL`,
    );
  }
}
