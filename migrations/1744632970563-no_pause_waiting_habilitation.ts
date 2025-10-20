import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTopomyneCommuneDeleguee1744632970563
  implements MigrationInterface
{
  name = 'AddTopomyneCommuneDeleguee1744632970563';

  private async getHabilitation(habilitationId: string) {
    const response = await fetch(
      `${process.env.API_DEPOT_URL}/habilitations/${habilitationId}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${process.env.API_DEPOT_CLIENT_SECRET}`,
          'Content-Type': 'application/json',
        },
      },
    );
    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }
    return response.json();
  }

  private async getBaseLocaleToUpdated(basesLocales: any[]): Promise<string[]> {
    const balIdsToUpdate: string[] = [];
    const date = new Date(2025, 8, 16);

    for (const baseLocale of basesLocales) {
      if (baseLocale.habilitation_id) {
        try {
          const habilitation = await this.getHabilitation(
            baseLocale.habilitation_id,
          );
          if (
            habilitation.status &&
            habilitation.expireAt &&
            habilitation.status === 'accepted' &&
            new Date(habilitation.expireAt) < date
          ) {
            balIdsToUpdate.push(baseLocale.id);
          }
        } catch (error) {
          console.error(
            `Erreur lors de la récupération de l'habilitation ${baseLocale.habilitation_id}: ${error}`,
          );
        }
      }
    }
    return balIdsToUpdate;
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    const basesLocales = await queryRunner.query(
      `SELECT * FROM bases_locales WHERE sync->>'isPaused' = 'true'`,
    );

    const balIdsToUpdate = await this.getBaseLocaleToUpdated(basesLocales);

    await queryRunner.query(
      `UPDATE bases_locales 
      SET sync->>'isPaused' = 'false' 
      WHERE id IN (${balIdsToUpdate.join(',')})`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
