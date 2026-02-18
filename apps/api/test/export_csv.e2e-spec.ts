import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { Repository } from 'typeorm';

import { Numero } from '@/shared/entities/numero.entity';
import { Voie } from '@/shared/entities/voie.entity';
import { Toponyme } from '@/shared/entities/toponyme.entity';
import { BaseLocale } from '@/shared/entities/base_locale.entity';

import { BaseLocaleModule } from '@/modules/base_locale/base_locale.module';
import { MailerModule } from '@/shared/test/mailer.module.test';
import {
  createBal,
  createNumero,
  createPositions,
  createToponyme,
  createVoie,
  deleteRepositories,
  getTypeORMModule,
  getTypeormRepository,
  initTypeormRepository,
  startPostgresContainer,
  stopPostgresContainer,
  token,
} from './typeorm.utils';

describe('EXPORT CSV - codeVoie', () => {
  let app: INestApplication;
  let repositories: {
    numeros: Repository<Numero>;
    voies: Repository<Voie>;
    bals: Repository<BaseLocale>;
    toponymes: Repository<Toponyme>;
  };

  beforeAll(async () => {
    await startPostgresContainer();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [getTypeORMModule(), BaseLocaleModule, MailerModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
    initTypeormRepository(app);
    repositories = getTypeormRepository();
  });

  afterEach(async () => {
    await deleteRepositories();
  });

  afterAll(async () => {
    await stopPostgresContainer();
    await app.close();
  });

  describe('GET /bases-locales/:id/csv - codeVoie export', () => {
    it('Export CSV with voie having custom codeVoie - uses codeVoie in cle_interop', async () => {
      const balId = await createBal({ nom: 'bal', commune: '08053' });
      const { banId: communeUuid } = await repositories.bals.findOneBy({
        id: balId,
      });

      const voieId = await createVoie(balId, {
        nom: 'rue de la paix',
        codeVoie: 'abcd',
      });
      const { banId: voieUuid } = await repositories.voies.findOneBy({
        id: voieId,
      });

      const numeroId = await createNumero(balId, voieId, {
        numero: 1,
        positions: [createPositions()],
      });
      const { banId: numeroUuid } = await repositories.numeros.findOneBy({
        id: numeroId,
      });

      const response = await request(app.getHttpServer())
        .get(`/bases-locales/${balId}/csv`)
        .set('token', token)
        .expect(200);

      expect(response.headers['content-type']).toEqual(
        'text/csv; charset=utf-8',
      );

      // Verify cle_interop contains the custom codeVoie 'abcd'
      expect(response.text).toContain('08053_abcd_00001');
      expect(response.text).toContain(communeUuid);
      expect(response.text).toContain(voieUuid);
      expect(response.text).toContain(numeroUuid);
    });

    it('Export CSV with voie having no codeVoie - uses default xxxx in cle_interop', async () => {
      const balId = await createBal({ nom: 'bal', commune: '08053' });

      const voieId = await createVoie(balId, {
        nom: 'rue de la paix',
        // No codeVoie set
      });

      await createNumero(balId, voieId, {
        numero: 1,
        positions: [createPositions()],
      });

      const response = await request(app.getHttpServer())
        .get(`/bases-locales/${balId}/csv`)
        .set('token', token)
        .expect(200);

      // Verify cle_interop contains the default codeVoie 'xxxx'
      expect(response.text).toContain('08053_xxxx_00001');
    });

    it('Export CSV with toponyme having custom codeVoie - uses codeVoie in cle_interop', async () => {
      const balId = await createBal({ nom: 'bal', commune: '08053' });
      const { banId: communeUuid } = await repositories.bals.findOneBy({
        id: balId,
      });

      const toponymeId = await createToponyme(balId, {
        nom: 'Le Hameau',
        codeVoie: 'topo',
        positions: [createPositions()],
      });
      const { banId: toponymeUuid } = await repositories.toponymes.findOneBy({
        id: toponymeId,
      });

      const response = await request(app.getHttpServer())
        .get(`/bases-locales/${balId}/csv`)
        .set('token', token)
        .expect(200);

      // Verify cle_interop for toponyme (99999) contains the custom codeVoie 'topo'
      expect(response.text).toContain('08053_topo_99999');
      expect(response.text).toContain(communeUuid);
      expect(response.text).toContain(toponymeUuid);
    });

    it('Export CSV with toponyme having no codeVoie - uses default xxxx in cle_interop', async () => {
      const balId = await createBal({ nom: 'bal', commune: '08053' });

      await createToponyme(balId, {
        nom: 'Le Hameau',
        // No codeVoie set
        positions: [createPositions()],
      });

      const response = await request(app.getHttpServer())
        .get(`/bases-locales/${balId}/csv`)
        .set('token', token)
        .expect(200);

      // Verify cle_interop for toponyme (99999) contains the default codeVoie 'xxxx'
      expect(response.text).toContain('08053_xxxx_99999');
    });

    it('Export CSV with mixed codeVoie - each entity uses its own codeVoie', async () => {
      const balId = await createBal({ nom: 'bal', commune: '08053' });

      // Voie with custom codeVoie
      const voieId1 = await createVoie(balId, {
        nom: 'rue avec code',
        codeVoie: 'a001',
      });
      await createNumero(balId, voieId1, {
        numero: 1,
        positions: [createPositions()],
      });

      // Voie without codeVoie
      const voieId2 = await createVoie(balId, {
        nom: 'rue sans code',
      });
      await createNumero(balId, voieId2, {
        numero: 2,
        positions: [createPositions()],
      });

      // Toponyme with custom codeVoie
      await createToponyme(balId, {
        nom: 'Lieu-dit avec code',
        codeVoie: 'b002',
        positions: [createPositions()],
      });

      const response = await request(app.getHttpServer())
        .get(`/bases-locales/${balId}/csv`)
        .set('token', token)
        .expect(200);

      // Verify each entity uses its own codeVoie
      expect(response.text).toContain('08053_a001_00001'); // voie with codeVoie
      expect(response.text).toContain('08053_xxxx_00002'); // voie without codeVoie
      expect(response.text).toContain('08053_b002_99999'); // toponyme with codeVoie
    });
  });
});
