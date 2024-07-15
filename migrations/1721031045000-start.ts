import { MigrationInterface, QueryRunner } from "typeorm";

export class Start1721031045000 implements MigrationInterface {
    name = 'Start1721031045000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // await queryRunner.query(`CREATE EXTENSION postgis;`);
        await queryRunner.query(`CREATE TYPE "public"."positions_type_enum" AS ENUM('entrée', 'bâtiment', 'cage d’escalier', 'logement', 'service technique', 'délivrance postale', 'parcelle', 'segment', 'inconnue')`);
        await queryRunner.query(`CREATE TABLE "positions" ("id" SERIAL NOT NULL, "bal_id" character varying(24) NOT NULL, "toponyme_id" character varying(24), "numero_id" character varying(24), "type" "public"."positions_type_enum" NOT NULL DEFAULT 'entrée', "source" text, "point" geometry(Point) NOT NULL, CONSTRAINT "PK_17e4e62ccd5749b289ae3fae6f3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "toponymes" ("id" character varying(24) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "bal_id" character varying(24) NOT NULL, "nom" text NOT NULL, "nom_alt" json, "parcelles" text array, CONSTRAINT "PK_f8e0f31344c7c2543562a61c1f1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "numeros" ("id" character varying(24) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "bal_id" character varying(24) NOT NULL, "voie_id" character varying(24) NOT NULL, "toponyme_id" character varying(24), "numero" text NOT NULL, "suffixe" text, "comment" text, "parcelles" text array, "certifie" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_afc7d4916c4ae1472683de49489" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."voies_type_numerotation_enum" AS ENUM('numerique', 'metrique')`);
        await queryRunner.query(`CREATE TABLE "voies" ("id" character varying(24) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "bal_id" character varying(24) NOT NULL, "nom" text NOT NULL, "nom_alt" json, "type_numerotation" "public"."voies_type_numerotation_enum" NOT NULL DEFAULT 'numerique', "centroid" geometry(Point), "trace" geometry(LineString), CONSTRAINT "PK_80c425cf773e2b81a56ba55a08c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."bases_locales_status_enum" AS ENUM('draft', 'published', 'demo', 'replaced')`);
        await queryRunner.query(`CREATE TABLE "bases_locales" ("id" character varying(24) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "nom" text NOT NULL, "commune" character varying(5) NOT NULL, "emails" text array NOT NULL, "token" character varying(20) NOT NULL, "status" "public"."bases_locales_status_enum" NOT NULL, "habilitation" character varying(20), "sync" jsonb, CONSTRAINT "PK_9ebcac4bb5518b2d3e0894cb5c4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "positions" ADD CONSTRAINT "FK_a085cf9b9ac326f5ac8b95a24a3" FOREIGN KEY ("toponyme_id") REFERENCES "toponymes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "positions" ADD CONSTRAINT "FK_9c67f5a501ad6b85c76322763a2" FOREIGN KEY ("numero_id") REFERENCES "numeros"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "positions" ADD CONSTRAINT "FK_f44f6b9d8ccb2717953b8a3f2dd" FOREIGN KEY ("bal_id") REFERENCES "bases_locales"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
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
        await queryRunner.query(`ALTER TABLE "positions" DROP CONSTRAINT "FK_f44f6b9d8ccb2717953b8a3f2dd"`);
        await queryRunner.query(`ALTER TABLE "positions" DROP CONSTRAINT "FK_9c67f5a501ad6b85c76322763a2"`);
        await queryRunner.query(`ALTER TABLE "positions" DROP CONSTRAINT "FK_a085cf9b9ac326f5ac8b95a24a3"`);
        await queryRunner.query(`DROP TABLE "bases_locales"`);
        await queryRunner.query(`DROP TYPE "public"."bases_locales_status_enum"`);
        await queryRunner.query(`DROP TABLE "voies"`);
        await queryRunner.query(`DROP TYPE "public"."voies_type_numerotation_enum"`);
        await queryRunner.query(`DROP TABLE "numeros"`);
        await queryRunner.query(`DROP TABLE "toponymes"`);
        await queryRunner.query(`DROP TABLE "positions"`);
        await queryRunner.query(`DROP TYPE "public"."positions_type_enum"`);
    }

}
