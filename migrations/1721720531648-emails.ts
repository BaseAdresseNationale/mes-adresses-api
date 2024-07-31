import { MigrationInterface, QueryRunner } from 'typeorm';

export class Emails1721720531648 implements MigrationInterface {
  name = 'Emails1721720531648';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "bases_locales" ALTER COLUMN "emails" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "bases_locales" ALTER COLUMN "emails" SET NOT NULL`,
    );
  }
}
