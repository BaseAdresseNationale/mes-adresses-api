import { MigrationInterface, QueryRunner } from 'typeorm';

export class VoieComment1732616067459 implements MigrationInterface {
  name = 'VoieComment1732616067459';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "voies" ADD "comment" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "voies" DROP COLUMN "comment"`);
  }
}
