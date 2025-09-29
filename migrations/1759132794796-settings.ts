import { MigrationInterface, QueryRunner } from 'typeorm';

export class Settings1759132794796 implements MigrationInterface {
  name = 'Settings1759132794796';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "bases_locales" ADD "settings" jsonb`);
    await queryRunner.query(`
      UPDATE "bases_locales" 
      SET "settings" = '{"languageGoalAccepted": null, "toponymeGoalAccepted": null}'::jsonb
      WHERE "settings" IS NULL
    `);
    // Inititaliser le objectif toponyme qui sont deja accepté
    await queryRunner.query(`
      UPDATE "bases_locales" 
      SET "settings" = jsonb_set(
        COALESCE("settings", '{}'::jsonb),
        '{toponymeGoalAccepted}',
        'true'::jsonb
      )
      WHERE EXISTS (
        SELECT 1 FROM "toponymes" 
        WHERE "toponymes"."bal_id" = "bases_locales"."id" AND "toponymes"."deleted_at" IS NULL
      )
    `);
    // Inititaliser le objectif multi language qui sont deja accepté
    await queryRunner.query(`
      UPDATE "bases_locales" 
      SET "settings" = jsonb_set(
        COALESCE("settings", '{}'::jsonb),
        '{languageGoalAccepted}',
        'true'::jsonb
      )
      WHERE (
        "commune_noms_alt" IS NOT NULL 
        OR EXISTS (
          SELECT 1 FROM "voies" 
          WHERE "voies"."bal_id" = "bases_locales"."id" 
          AND "voies"."nom_alt" IS NOT NULL AND "voies"."deleted_at" IS NULL
        )
        OR EXISTS (
          SELECT 1 FROM "toponymes" 
          WHERE "toponymes"."bal_id" = "bases_locales"."id" 
          AND "toponymes"."nom_alt" IS NOT NULL AND "toponymes"."deleted_at" IS NULL
        )
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "bases_locales" DROP COLUMN "settings"`,
    );
  }
}
