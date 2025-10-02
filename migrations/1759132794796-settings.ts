import { MigrationInterface, QueryRunner } from 'typeorm';

export class Settings1759132794796 implements MigrationInterface {
  name = 'Settings1759132794796';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "bases_locales" ADD "settings" jsonb`);
    await queryRunner.query(`
      UPDATE "bases_locales" 
      SET "settings" = '{"languageGoalIgnored": false, "toponymeGoalIgnored": false}'::jsonb
      WHERE "settings" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "bases_locales" DROP COLUMN "settings"`,
    );
  }
}
