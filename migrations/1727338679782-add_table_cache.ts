import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTableCache1727338679782 implements MigrationInterface {
  name = 'AddTableCache1727338679782';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "cache" (
        "key" VARCHAR(255) NOT NULL PRIMARY KEY,
        "value" TEXT NOT NULL,
        "created_at" TIMESTAMP DEFAULT now(),
        "updated_at" TIMESTAMP DEFAULT now()
      )`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "cache"`);
  }
}
