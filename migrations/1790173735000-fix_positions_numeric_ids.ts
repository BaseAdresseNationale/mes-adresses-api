import { MigrationInterface, QueryRunner } from 'typeorm';
import { ObjectId } from 'mongodb';

export class FixPositionsNumericIds1790173735000
  implements MigrationInterface
{
  name = 'FixPositionsNumericIds1790173735000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const rows = await queryRunner.query(
      `SELECT id, toponyme_id, numero_id FROM positions WHERE id ~ '^[0-9]+$'`,
    );

    let fixedSingle = 0;
    let split = 0;
    let deletedEmpty = 0;

    for (const row of rows) {
      const { id, toponyme_id: toponymeId, numero_id: numeroId } = row;

      if (!toponymeId && !numeroId) {
        await queryRunner.query(`DELETE FROM positions WHERE id = $1`, [id]);
        deletedEmpty++;
        continue;
      }

      if (toponymeId && numeroId) {
        const numeroPositionId = new ObjectId().toHexString();
        const toponymePositionId = new ObjectId().toHexString();

        await queryRunner.query(
          `INSERT INTO positions (id, toponyme_id, numero_id, type, source, rank, point)
           SELECT $1, NULL, numero_id, type, source, rank, point
           FROM positions WHERE id = $2`,
          [numeroPositionId, id],
        );

        await queryRunner.query(
          `UPDATE positions SET id = $1, numero_id = NULL WHERE id = $2`,
          [toponymePositionId, id],
        );

        split++;
        continue;
      }

      const newId = new ObjectId().toHexString();
      await queryRunner.query(`UPDATE positions SET id = $1 WHERE id = $2`, [
        newId,
        id,
      ]);
      fixedSingle++;
    }

    console.log(
      `FixPositionsNumericIds: ${fixedSingle} id(s) renumérotés, ${split} ligne(s) éclatée(s), ${deletedEmpty} ligne(s) vide(s) supprimée(s)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
