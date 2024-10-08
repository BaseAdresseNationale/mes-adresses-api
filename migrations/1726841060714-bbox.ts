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
    const result = await queryRunner.manager
      .getRepository(Numero)
      .createQueryBuilder('numeros')
      .select('numeros.voie_id', 'voieId')
      .addSelect(
        'ST_AsGeoJSON(ST_Extent(positions.point::geometry))',
        'polygon',
      )
      .leftJoin('numeros.positions', 'positions')
      .groupBy('numeros.voie_id')
      .getRawMany();

    for (const { voieId, polygon } of result) {
      const bbox: number[] = turf.bbox(JSON.parse(polygon));
      await queryRunner.manager
        .getRepository(Voie)
        .update({ id: voieId }, { bbox });
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "voies" DROP COLUMN "bbox"`);
  }
}
