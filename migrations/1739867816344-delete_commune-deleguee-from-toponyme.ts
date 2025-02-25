import { MigrationInterface, QueryRunner } from "typeorm";

export class DeleteCommuneDelegueeFromToponyme1739867816344 implements MigrationInterface {
    name = 'DeleteCommuneDelegueeFromToponyme1739867816344'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "toponymes" DROP COLUMN "commune_deleguee"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "toponymes" ADD "commune_deleguee" character varying(5)`);
    }
}
