import { MigrationInterface, QueryRunner } from 'typeorm';

export class CommuneAddCommuneNomsAlt1736757828173
  implements MigrationInterface
{
  name = 'CommuneAddCommuneNomsAlt1736757828173';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "bases_locales" ADD "commune_noms_alt" json`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "bases_locales" DROP COLUMN "commune_noms_alt"`,
    );
  }
}
