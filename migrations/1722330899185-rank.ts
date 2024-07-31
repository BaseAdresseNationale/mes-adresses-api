import { MigrationInterface, QueryRunner } from 'typeorm';

export class Rank1722330899185 implements MigrationInterface {
  name = 'Rank1722330899185';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "positions" RENAME COLUMN "order" TO "rank"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "positions" RENAME COLUMN "rank" TO "order"`,
    );
  }
}
