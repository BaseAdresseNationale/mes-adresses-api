import { MigrationInterface, QueryRunner } from "typeorm";

export class Initialization1724762471013 implements MigrationInterface {
    name = 'Initialization1724762471013'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."positions_type_enum" AS ENUM('entrée', 'bâtiment', 'cage d’escalier', 'logement', 'service technique', 'délivrance postale', 'parcelle', 'segment', 'inconnue')`);
        await queryRunner.query(`CREATE TABLE "positions" ("id" character varying(32) NOT NULL, "toponyme_id" character varying(32), "numero_id" character varying(32), "type" "public"."positions_type_enum" NOT NULL DEFAULT 'entrée', "source" text, "rank" integer NOT NULL, "point" geometry(Point,4326) NOT NULL, CONSTRAINT "PK_17e4e62ccd5749b289ae3fae6f3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_positions_toponyme_id" ON "positions" ("toponyme_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_positions_numeros_id" ON "positions" ("numero_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_positions_point" ON "positions" USING GiST ("point") `);
        await queryRunner.query(`CREATE TABLE "toponymes" ("id" character varying(32) NOT NULL, "ban_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "bal_id" character varying(32) NOT NULL, "nom" text NOT NULL, "nom_alt" json, "parcelles" text array, CONSTRAINT "PK_f8e0f31344c7c2543562a61c1f1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_dea41337f8e45ebf48eaed9278" ON "toponymes" ("deleted_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_toponymes_bal_id" ON "toponymes" ("bal_id") `);
        await queryRunner.query(`CREATE TABLE "numeros" ("id" character varying(32) NOT NULL, "ban_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "bal_id" character varying(32) NOT NULL, "voie_id" character varying(32) NOT NULL, "toponyme_id" character varying(32), "numero" integer NOT NULL, "suffixe" text, "comment" text, "parcelles" text array, "certifie" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_afc7d4916c4ae1472683de49489" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_fb9fdf6c71d959014d2005e5df" ON "numeros" ("deleted_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_numeros_bal_id" ON "numeros" ("bal_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_numeros_voie_id" ON "numeros" ("voie_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_numeros_toponyme_id" ON "numeros" ("toponyme_id") `);
        await queryRunner.query(`CREATE TYPE "public"."voies_type_numerotation_enum" AS ENUM('numerique', 'metrique')`);
        await queryRunner.query(`CREATE TABLE "voies" ("id" character varying(32) NOT NULL, "ban_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "bal_id" character varying(32) NOT NULL, "nom" text NOT NULL, "nom_alt" json, "type_numerotation" "public"."voies_type_numerotation_enum" NOT NULL DEFAULT 'numerique', "centroid" geometry(Point,4326), "trace" geometry(LineString,4326), CONSTRAINT "PK_80c425cf773e2b81a56ba55a08c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_9d6a9644d51d5ecc47df8a35cb" ON "voies" ("deleted_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_voies_bal_id" ON "voies" ("bal_id") `);
        await queryRunner.query(`CREATE TYPE "public"."bases_locales_status_enum" AS ENUM('draft', 'published', 'demo', 'replaced')`);
        await queryRunner.query(`CREATE TABLE "bases_locales" ("id" character varying(32) NOT NULL, "ban_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "nom" text NOT NULL, "commune" character varying(5) NOT NULL, "emails" text array, "token" character varying(20) NOT NULL, "status" "public"."bases_locales_status_enum" NOT NULL, "habilitation_id" character varying(24), "sync" jsonb, CONSTRAINT "PK_9ebcac4bb5518b2d3e0894cb5c4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_f1c7a3caf3dca9bb53794d58f3" ON "bases_locales" ("deleted_at") `);
        await queryRunner.query(`ALTER TABLE "positions" ADD CONSTRAINT "FK_a085cf9b9ac326f5ac8b95a24a3" FOREIGN KEY ("toponyme_id") REFERENCES "toponymes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "positions" ADD CONSTRAINT "FK_9c67f5a501ad6b85c76322763a2" FOREIGN KEY ("numero_id") REFERENCES "numeros"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "toponymes" ADD CONSTRAINT "FK_9c20685d64e23cd748e2aa13c28" FOREIGN KEY ("bal_id") REFERENCES "bases_locales"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "numeros" ADD CONSTRAINT "FK_dd823e556d4b255deae92952f03" FOREIGN KEY ("bal_id") REFERENCES "bases_locales"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "numeros" ADD CONSTRAINT "FK_94139df4b633b19174d80f86806" FOREIGN KEY ("voie_id") REFERENCES "voies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "numeros" ADD CONSTRAINT "FK_b467148fe65ba857534bdc83c56" FOREIGN KEY ("toponyme_id") REFERENCES "toponymes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "voies" ADD CONSTRAINT "FK_c8ebcc5e894d640fbabbd081c80" FOREIGN KEY ("bal_id") REFERENCES "bases_locales"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "voies" DROP CONSTRAINT "FK_c8ebcc5e894d640fbabbd081c80"`);
        await queryRunner.query(`ALTER TABLE "numeros" DROP CONSTRAINT "FK_b467148fe65ba857534bdc83c56"`);
        await queryRunner.query(`ALTER TABLE "numeros" DROP CONSTRAINT "FK_94139df4b633b19174d80f86806"`);
        await queryRunner.query(`ALTER TABLE "numeros" DROP CONSTRAINT "FK_dd823e556d4b255deae92952f03"`);
        await queryRunner.query(`ALTER TABLE "toponymes" DROP CONSTRAINT "FK_9c20685d64e23cd748e2aa13c28"`);
        await queryRunner.query(`ALTER TABLE "positions" DROP CONSTRAINT "FK_9c67f5a501ad6b85c76322763a2"`);
        await queryRunner.query(`ALTER TABLE "positions" DROP CONSTRAINT "FK_a085cf9b9ac326f5ac8b95a24a3"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f1c7a3caf3dca9bb53794d58f3"`);
        await queryRunner.query(`DROP TABLE "bases_locales"`);
        await queryRunner.query(`DROP TYPE "public"."bases_locales_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_voies_bal_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9d6a9644d51d5ecc47df8a35cb"`);
        await queryRunner.query(`DROP TABLE "voies"`);
        await queryRunner.query(`DROP TYPE "public"."voies_type_numerotation_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_numeros_toponyme_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_numeros_voie_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_numeros_bal_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_fb9fdf6c71d959014d2005e5df"`);
        await queryRunner.query(`DROP TABLE "numeros"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_toponymes_bal_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_dea41337f8e45ebf48eaed9278"`);
        await queryRunner.query(`DROP TABLE "toponymes"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_positions_point"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_positions_numeros_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_positions_toponyme_id"`);
        await queryRunner.query(`DROP TABLE "positions"`);
        await queryRunner.query(`DROP TYPE "public"."positions_type_enum"`);
    }

}
