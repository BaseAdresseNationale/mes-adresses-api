import { MigrationInterface, QueryRunner } from 'typeorm';

export class Alert1759332350958 implements MigrationInterface {
  name = 'Alert1759332350958';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."alerts_severity_enum" AS ENUM('E', 'W', 'I')`,
    );
    await queryRunner.query(
      `CREATE TABLE "alerts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "bal_id" character varying(24) NOT NULL, "voie_id" character varying(24), "toponyme_id" character varying(24), "numero_id" character varying(24), "field" text NOT NULL, "value" text NOT NULL, "error" text NOT NULL, "severity" "public"."alerts_severity_enum" NOT NULL, "isIgnored" text NOT NULL DEFAULT false, CONSTRAINT "CHK_121c510d32ae696db64701ffa7" CHECK (((voie_id IS NOT NULL)::int + (toponyme_id IS NOT NULL)::int + (numero_id IS NOT NULL)::int) = 1), CONSTRAINT "PK_60f895662df096bfcdfab7f4b96" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_alerts_bal_id" ON "alerts" ("bal_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_alerts_voie_id" ON "alerts" ("voie_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_alerts_toponyme_id" ON "alerts" ("toponyme_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_alerts_numeros_id" ON "alerts" ("numero_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "alerts" ADD CONSTRAINT "FK_586cf2d511f036fd8eae80eb4e4" FOREIGN KEY ("bal_id") REFERENCES "bases_locales"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "alerts" ADD CONSTRAINT "FK_01b68018e93bccbdf77bf0f4fba" FOREIGN KEY ("voie_id") REFERENCES "voies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "alerts" ADD CONSTRAINT "FK_78ef7fe850106b7f16c2ac2505a" FOREIGN KEY ("toponyme_id") REFERENCES "toponymes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "alerts" ADD CONSTRAINT "FK_871ab232f19b97b63cb72725b2c" FOREIGN KEY ("numero_id") REFERENCES "numeros"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "alerts" DROP CONSTRAINT "FK_871ab232f19b97b63cb72725b2c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "alerts" DROP CONSTRAINT "FK_78ef7fe850106b7f16c2ac2505a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "alerts" DROP CONSTRAINT "FK_01b68018e93bccbdf77bf0f4fba"`,
    );
    await queryRunner.query(
      `ALTER TABLE "alerts" DROP CONSTRAINT "FK_586cf2d511f036fd8eae80eb4e4"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_alerts_numeros_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_alerts_toponyme_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_alerts_voie_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_alerts_bal_id"`);
    await queryRunner.query(`DROP TABLE "alerts"`);
    await queryRunner.query(`DROP TYPE "public"."alerts_severity_enum"`);
  }
}
