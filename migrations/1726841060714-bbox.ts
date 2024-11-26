import { MigrationInterface, QueryRunner } from 'typeorm';
import * as turf from '@turf/turf';
import { Numero } from '../libs/shared/src/entities/numero.entity';
import { Voie } from '../libs/shared/src/entities/voie.entity';

export class Bbox1726841060714 implements MigrationInterface {
  name = 'Bbox1726841060714';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "voies" ADD "bbox" double precision array`,
    );

    await queryRunner.query(
      `WITH voie_polygon AS (
        SELECT "voie"."id" AS "id", ST_Envelope(ST_Extent(positions.point::geometry)) AS "bbox" 
        FROM "voies" "voie"
        LEFT JOIN "numeros" "numeros" ON "numeros"."voie_id"="voie"."id" 
        LEFT JOIN "positions" "positions" ON "positions"."numero_id"="numeros"."id" 
        GROUP BY voie.id
      )
      UPDATE voies
      SET bbox = ARRAY[
          ST_XMin("voie_polygon"."bbox")::double precision,
          ST_YMin("voie_polygon"."bbox")::double precision,
          ST_XMax("voie_polygon"."bbox")::double precision,
          ST_YMax("voie_polygon"."bbox")::double precision
        ]
      FROM voie_polygon
      WHERE voie_polygon.id = voies.id`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "voies" DROP COLUMN "bbox"`);
  }
}
