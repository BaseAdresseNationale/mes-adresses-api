import { MigrationInterface, QueryRunner } from 'typeorm';

export class Index21722416272415 implements MigrationInterface {
  name = 'Index21722416272415';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a085cf9b9ac326f5ac8b95a24a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9c67f5a501ad6b85c76322763a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_506eef5b9937f9b06f5cfee0c9"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9c20685d64e23cd748e2aa13c2"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_dd823e556d4b255deae92952f0"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_94139df4b633b19174d80f8680"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b467148fe65ba857534bdc83c5"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c8ebcc5e894d640fbabbd081c8"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_positions_toponyme_id" ON "positions" ("toponyme_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_positions_numeros_id" ON "positions" ("numero_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_positions_point" ON "positions" USING GiST ("point") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_toponymes_bal_id" ON "toponymes" ("bal_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_numeros_bal_id" ON "numeros" ("bal_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_numeros_voie_id" ON "numeros" ("voie_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_numeros_toponyme_id" ON "numeros" ("toponyme_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_voies_bal_id" ON "voies" ("bal_id") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_voies_bal_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_numeros_toponyme_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_numeros_voie_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_numeros_bal_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_toponymes_bal_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_positions_point"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_positions_numeros_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_positions_toponyme_id"`);
    await queryRunner.query(
      `CREATE INDEX "IDX_c8ebcc5e894d640fbabbd081c8" ON "voies" ("bal_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b467148fe65ba857534bdc83c5" ON "numeros" ("toponyme_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_94139df4b633b19174d80f8680" ON "numeros" ("voie_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_dd823e556d4b255deae92952f0" ON "numeros" ("bal_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9c20685d64e23cd748e2aa13c2" ON "toponymes" ("bal_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_506eef5b9937f9b06f5cfee0c9" ON "positions" USING GiST ("point") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9c67f5a501ad6b85c76322763a" ON "positions" ("numero_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a085cf9b9ac326f5ac8b95a24a" ON "positions" ("toponyme_id") `,
    );
  }
}
