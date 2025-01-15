import { MigrationInterface, QueryRunner } from 'typeorm';

export class DeletePositionInconnue1736244568004 implements MigrationInterface {
  name = 'DeletePositionInconnue1736244568004';

  private async queryPositionTypeToEntree(queryRunner: QueryRunner, limit) {
    return await queryRunner.query(
      `WITH updated_rows AS (
          SELECT id
          FROM positions
          WHERE type = 'inconnue'
          LIMIT ${limit}
      )
      UPDATE positions
      SET type = 'entrée'
      WHERE id IN (SELECT id FROM updated_rows);`,
    );
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    const limit = 10000;
    let count = 0;
    let res = await this.queryPositionTypeToEntree(queryRunner, limit);
    while (res[1] >= limit) {
      count += res[1];
      console.log(`COUNT ${count}`);
      res = await this.queryPositionTypeToEntree(queryRunner, limit);
    }
    await queryRunner.query(
      `ALTER TYPE "public"."positions_type_enum" RENAME TO "positions_type_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."positions_type_enum" AS ENUM('entrée', 'bâtiment', 'cage d’escalier', 'logement', 'service technique', 'délivrance postale', 'parcelle', 'segment')`,
    );
    await queryRunner.query(
      `ALTER TABLE "positions" ALTER COLUMN "type" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "positions" ALTER COLUMN "type" TYPE "public"."positions_type_enum" USING "type"::"text"::"public"."positions_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "positions" ALTER COLUMN "type" SET DEFAULT 'entrée'`,
    );
    await queryRunner.query(`DROP TYPE "public"."positions_type_enum_old"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."positions_type_enum_old" AS ENUM('entrée', 'bâtiment', 'cage d’escalier', 'logement', 'service technique', 'délivrance postale', 'parcelle', 'segment', 'inconnue')`,
    );
    await queryRunner.query(
      `ALTER TABLE "positions" ALTER COLUMN "type" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "positions" ALTER COLUMN "type" TYPE "public"."positions_type_enum_old" USING "type"::"text"::"public"."positions_type_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "positions" ALTER COLUMN "type" SET DEFAULT 'entrée'`,
    );
    await queryRunner.query(`DROP TYPE "public"."positions_type_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."positions_type_enum_old" RENAME TO "positions_type_enum"`,
    );
  }
}
