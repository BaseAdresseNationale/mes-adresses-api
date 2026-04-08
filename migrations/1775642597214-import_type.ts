import { MigrationInterface, QueryRunner } from "typeorm";

export class ImportType1775642597214 implements MigrationInterface {
    name = 'ImportType1775642597214'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."bases_locales_import_type_enum" AS ENUM('api-depot', 'ban', 'csv')`);
        await queryRunner.query(`ALTER TABLE "bases_locales" ADD "import_type" "public"."bases_locales_import_type_enum"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "bases_locales" DROP COLUMN "import_type"`);
        await queryRunner.query(`DROP TYPE "public"."bases_locales_import_type_enum"`);
    }

}
