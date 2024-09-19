import { MigrationInterface, QueryRunner } from 'typeorm';

export class OnDeleteCascadeNumeros1726747666619 implements MigrationInterface {
  name = 'OnDeleteCascadeNumeros1726747666619';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "numeros" DROP CONSTRAINT "FK_dd823e556d4b255deae92952f03"`,
    );
    await queryRunner.query(
      `ALTER TABLE "numeros" ADD CONSTRAINT "FK_dd823e556d4b255deae92952f03" FOREIGN KEY ("bal_id") REFERENCES "bases_locales"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "numeros" DROP CONSTRAINT "FK_dd823e556d4b255deae92952f03"`,
    );
    await queryRunner.query(
      `ALTER TABLE "numeros" ADD CONSTRAINT "FK_dd823e556d4b255deae92952f03" FOREIGN KEY ("bal_id") REFERENCES "bases_locales"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
