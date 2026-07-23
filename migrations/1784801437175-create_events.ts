import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEvents1784801437175 implements MigrationInterface {
  name = 'CreateEvents1784801437175';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(
      `CREATE TYPE "public"."events_entity_type_enum" AS ENUM('voie', 'toponyme', 'numero', 'position', 'composite')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."events_action_enum" AS ENUM('CREATE', 'UPDATE', 'DELETE', 'MERGE_VOIES', 'CONVERT_VOIE_TO_TOPONYME')`,
    );
    await queryRunner.query(
      `CREATE TABLE "events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "bal_id" character varying(24) NOT NULL, "parent_event_id" uuid, "entity_type" "public"."events_entity_type_enum" NOT NULL, "entity_id" character varying(24), "action" "public"."events_action_enum" NOT NULL, "payload_before" jsonb, "payload_after" jsonb, "is_synced" boolean NOT NULL DEFAULT false, "synced_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_events_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_events_unsynced_entity" ON "events" ("entity_type", "entity_id") WHERE "is_synced" = false AND "entity_id" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_events_bal_id_is_synced" ON "events" ("bal_id", "is_synced")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_events_parent_event_id" ON "events" ("parent_event_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "events" ADD CONSTRAINT "FK_events_parent_event_id" FOREIGN KEY ("parent_event_id") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "events" DROP CONSTRAINT "FK_events_parent_event_id"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_events_parent_event_id"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_events_bal_id_is_synced"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_events_unsynced_entity"`);
    await queryRunner.query(`DROP TABLE "events"`);
    await queryRunner.query(`DROP TYPE "public"."events_action_enum"`);
    await queryRunner.query(`DROP TYPE "public"."events_entity_type_enum"`);
  }
}
