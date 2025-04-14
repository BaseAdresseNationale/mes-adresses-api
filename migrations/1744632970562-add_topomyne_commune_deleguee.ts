import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTopomyneCommuneDeleguee1744632970562
  implements MigrationInterface
{
  name = 'AddTopomyneCommuneDeleguee1744632970562';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "toponymes" ADD "commune_deleguee" character varying(5)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "toponymes" DROP COLUMN "commune_deleguee"`,
    );
  }
}
