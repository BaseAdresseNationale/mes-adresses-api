import { MigrationInterface, QueryRunner } from 'typeorm';
import { getEmailsMairie } from '../apps/api/src/lib/utils/annuaire-service-public';

export class UpdateMarieMails1759132794797 implements MigrationInterface {
  name = 'UpdateMarieMails1759132794797';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const baseLocales = await queryRunner.query(
      `SELECT * FROM "bases_locales" WHERE "status" = 'published'`,
    );
    for (const baseLocale of baseLocales) {
      const codeCommune = baseLocale.commune;
      const emails = await getEmailsMairie(codeCommune);
      if (emails) {
        const uniqEmails = new Set([...emails, ...baseLocale.emails]);
        await queryRunner.query(
          'UPDATE "bases_locales" SET "emails" = $1 WHERE "id" = $2',
          [[...uniqEmails], baseLocale.id],
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
