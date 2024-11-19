import { MigrationInterface, QueryRunner } from 'typeorm';

export class DeletePositionsEmpty1727338679783 implements MigrationInterface {
  name = 'DeletePositionsEmpty1727338679783';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM positions WHERE toponyme_id IS NULL AND numero_id IS NULL;`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
