import { MigrationInterface, QueryRunner } from 'typeorm';

export class PositionIsDefault1742313153363 implements MigrationInterface {
  name = 'PositionIsDefault1742313153363';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "positions" ADD "is_default" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `WITH chosen AS (
        SELECT DISTINCT ON (numero_id) id
        FROM positions
        ORDER BY numero_id,
            CASE 
                WHEN type = 'entrée'    THEN 1
                WHEN type = 'bâtiment' THEN 2
                WHEN type = 'cage d’escalier' THEN 3
                WHEN type = 'logement' THEN 4
                WHEN type = 'service technique' THEN 5
                WHEN type = 'délivrance postale' THEN 6
                WHEN type = 'parcelle' THEN 7
                WHEN type = 'segment' THEN 8
                ELSE 9
            END,
            id
        )
        UPDATE positions p
        SET is_default = true
        FROM chosen c
        WHERE p.id = c.id;`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "positions" DROP COLUMN "default"`);
  }
}
