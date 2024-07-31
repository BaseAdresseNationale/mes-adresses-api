import { MigrationInterface, QueryRunner } from 'typeorm';

export class Emails1721737016715 implements MigrationInterface {
  name = 'Emails1721737016715';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "numeros" DROP COLUMN "numero"`);
    await queryRunner.query(
      `ALTER TABLE "numeros" ADD "numero" integer NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "numeros" DROP COLUMN "numero"`);
    await queryRunner.query(`ALTER TABLE "numeros" ADD "numero" text NOT NULL`);
  }
}
