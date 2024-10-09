import { MigrationInterface, QueryRunner } from 'typeorm';

export class VoieCommuneDeleguee1728477879962 implements MigrationInterface {
  name = 'VoieCommuneDeleguee1728477879962';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "toponymes" ADD "commune_deleguee" character varying(5)`,
    );
    await queryRunner.query(
      `ALTER TABLE "voies" ADD "commune_deleguee" character varying(5)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "voies" DROP COLUMN "commune_deleguee"`,
    );
    await queryRunner.query(
      `ALTER TABLE "toponymes" DROP COLUMN "commune_deleguee"`,
    );
  }
}
