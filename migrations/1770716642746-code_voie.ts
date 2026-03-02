import { MigrationInterface, QueryRunner } from "typeorm";

export class CodeVoie1770716642746 implements MigrationInterface {
    name = 'CodeVoie1770716642746'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "toponymes" ADD "code_voie" character varying(4)`);
        await queryRunner.query(`ALTER TABLE "voies" ADD "code_voie" character varying(4)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "voies" DROP COLUMN "code_voie"`);
        await queryRunner.query(`ALTER TABLE "toponymes" DROP COLUMN "code_voie"`);
    }

}
