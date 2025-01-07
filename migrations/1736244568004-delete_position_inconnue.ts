import { MigrationInterface, QueryRunner } from 'typeorm';

export class DeletePositionInconnue1736244568004 implements MigrationInterface {
  name = 'DeletePositionInconnue1736244568004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE positions SET type = 'entrée' WHERE type = 'inconnue'`,
    );
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
