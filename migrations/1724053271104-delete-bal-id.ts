import { MigrationInterface, QueryRunner } from "typeorm";

export class DeleteBalId1724053271104 implements MigrationInterface {
    name = 'DeleteBalId1724053271104'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "positions" DROP CONSTRAINT "FK_f44f6b9d8ccb2717953b8a3f2dd"`);
        await queryRunner.query(`ALTER TABLE "positions" DROP COLUMN "bal_id"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "positions" ADD "bal_id" character varying(32)`);
        await queryRunner.query(`ALTER TABLE "positions" ADD CONSTRAINT "FK_f44f6b9d8ccb2717953b8a3f2dd" FOREIGN KEY ("bal_id") REFERENCES "bases_locales"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
