import { MigrationInterface, QueryRunner } from 'typeorm';

export class CommuneAddNomAlt1736331743118 implements MigrationInterface {
  name = 'CommuneAddNomAlt1736331743118';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "bases_locales" ADD "nom_alt" json`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "bases_locales" DROP COLUMN "nom_alt"`,
    );
  }
}
