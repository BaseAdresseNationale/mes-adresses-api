import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVoieIdToEvents1784881220139 implements MigrationInterface {
  name = 'AddVoieIdToEvents1784881220139';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "events" ADD "voie_id" character varying(24)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_events_voie_id" ON "events" ("voie_id") WHERE "voie_id" IS NOT NULL`,
    );
    // Backfill best-effort from what's already recoverable — position events
    // carry no voieId in their own payload and are left untouched here, only
    // events registered from now on will have it set for that entity type.
    await queryRunner.query(
      `UPDATE "events" SET "voie_id" = "entity_id" WHERE "entity_type" = 'voie'`,
    );
    await queryRunner.query(
      `UPDATE "events" SET "voie_id" = "payload_before" ->> 'voieId' WHERE "entity_type" = 'numero' AND "payload_before" ? 'voieId'`,
    );
    await queryRunner.query(
      `UPDATE "events" SET "voie_id" = "payload_after" ->> 'voieId' WHERE "entity_type" = 'numero' AND "voie_id" IS NULL AND "payload_after" ? 'voieId'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_events_voie_id"`);
    await queryRunner.query(`ALTER TABLE "events" DROP COLUMN "voie_id"`);
  }
}
