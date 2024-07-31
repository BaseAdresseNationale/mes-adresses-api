import { MigrationInterface, QueryRunner } from 'typeorm';

export class Index1722325570094 implements MigrationInterface {
  name = 'Index1722325570094';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "positions" RENAME COLUMN "created_at" TO "order"`,
    );
    await queryRunner.query(`ALTER TABLE "positions" DROP COLUMN "order"`);
    await queryRunner.query(
      `ALTER TABLE "positions" ADD "order" integer NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a085cf9b9ac326f5ac8b95a24a" ON "positions" ("toponyme_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9c67f5a501ad6b85c76322763a" ON "positions" ("numero_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_506eef5b9937f9b06f5cfee0c9" ON "positions" USING GiST ("point") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_dea41337f8e45ebf48eaed9278" ON "toponymes" ("deleted_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9c20685d64e23cd748e2aa13c2" ON "toponymes" ("bal_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_fb9fdf6c71d959014d2005e5df" ON "numeros" ("deleted_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_dd823e556d4b255deae92952f0" ON "numeros" ("bal_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_94139df4b633b19174d80f8680" ON "numeros" ("voie_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b467148fe65ba857534bdc83c5" ON "numeros" ("toponyme_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9d6a9644d51d5ecc47df8a35cb" ON "voies" ("deleted_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c8ebcc5e894d640fbabbd081c8" ON "voies" ("bal_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f1c7a3caf3dca9bb53794d58f3" ON "bases_locales" ("deleted_at") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f1c7a3caf3dca9bb53794d58f3"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9ebcac4bb5518b2d3e0894cb5c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c8ebcc5e894d640fbabbd081c8"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9d6a9644d51d5ecc47df8a35cb"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_80c425cf773e2b81a56ba55a08"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b467148fe65ba857534bdc83c5"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_94139df4b633b19174d80f8680"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_dd823e556d4b255deae92952f0"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_fb9fdf6c71d959014d2005e5df"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_afc7d4916c4ae1472683de4948"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9c20685d64e23cd748e2aa13c2"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_dea41337f8e45ebf48eaed9278"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f8e0f31344c7c2543562a61c1f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_506eef5b9937f9b06f5cfee0c9"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9c67f5a501ad6b85c76322763a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a085cf9b9ac326f5ac8b95a24a"`,
    );
    await queryRunner.query(`ALTER TABLE "positions" DROP COLUMN "order"`);
    await queryRunner.query(
      `ALTER TABLE "positions" ADD "order" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "positions" RENAME COLUMN "order" TO "created_at"`,
    );
  }
}
