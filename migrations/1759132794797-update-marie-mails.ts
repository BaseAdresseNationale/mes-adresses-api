import { MigrationInterface, QueryRunner } from 'typeorm';
import { chunk } from 'lodash';

export class UpdateMarieMails1759132794797 implements MigrationInterface {
  name = 'UpdateMarieMails1759132794797';

  private async getMairies(codeCommunes: string[]): Promise<any> {
    const route = `${process.env.API_ETABLISSEMENTS_PUBLIC}/catalog/datasets/api-lannuaire-administration/records`;
    const query = `select=adresse_courriel,code_insee_commune&where=code_insee_commune IN (${codeCommunes
      .map((codeCommune) => `"${codeCommune}"`)
      .join(',')}) and pivot LIKE "mairie"&limit=-1`;
    const url = `${route}?${query}`;
    const response = await fetch(url);
    const data = await response.json();
    return data;
  }

  private validateEmail(email: string) {
    const re =
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[(?:\d{1,3}\.){3}\d{1,3}])|(([a-zA-Z\-\d]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
  }

  private async extractEmailsMairie(
    data: any,
    codeCommune: string,
  ): Promise<string[] | null> {
    try {
      const mairies = data.results.filter(
        ({ code_insee_commune, adresse_courriel }) =>
          code_insee_commune &&
          code_insee_commune === codeCommune &&
          adresse_courriel &&
          adresse_courriel !== '',
      );

      if (mairies.length <= 0) {
        throw new Error('L’adresse email n’est pas trouvé');
      }

      const emails: string[] = [
        ...new Set<string>(
          mairies
            .reduce(
              (accumulator, { adresse_courriel }) => [
                ...accumulator,
                ...adresse_courriel.split(';'),
              ],
              [],
            )
            .filter((email) => this.validateEmail(email)),
        ),
      ];

      if (emails.length > 0) {
        return emails;
      }

      throw new Error(
        `Les adresses emails " ${emails.join(',')} " ne peut pas être utilisée`,
      );
    } catch (error) {
      console.log(
        'Could not fetch mairie mail for commune : ',
        codeCommune,
        error,
      );
      return [];
    }
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    const baseLocales = await queryRunner.query(
      `SELECT * FROM "bases_locales" WHERE "status" = 'published'`,
    );
    for (const baseLocalesChunk of chunk(baseLocales, 100)) {
      const data = await this.getMairies(
        baseLocalesChunk.map((baseLocale) => baseLocale.commune),
      );
      for (const baseLocale of baseLocalesChunk) {
        const emails = await this.extractEmailsMairie(data, baseLocale.commune);
        if (emails) {
          const uniqEmails = new Set([...emails, ...baseLocale.emails]);
          await queryRunner.query(
            'UPDATE "bases_locales" SET "emails" = $1 WHERE "id" = $2',
            [[...uniqEmails], baseLocale.id],
          );
        }
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
