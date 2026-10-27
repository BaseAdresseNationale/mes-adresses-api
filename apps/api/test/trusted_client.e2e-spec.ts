import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';

import { StatusBaseLocalEnum } from '@/shared/entities/base_locale.entity';
import { MailerModule } from '@/shared/test/mailer.module.test';
import { BaseLocaleModule } from '@/modules/base_locale/base_locale.module';
import { TrustedClientModule } from '@/modules/trusted_client/trusted_client.module';
import {
  createBal,
  deleteRepositories,
  getTypeORMModule,
  initTypeormRepository,
  startPostgresContainer,
  stopPostgresContainer,
  token,
} from './typeorm.utils';

const CLIENT_SECRET = 'mes-donnees-geo-secret';
process.env.MES_DONNEES_GEO_CLIENT_SECRET = CLIENT_SECRET;

describe('TRUSTED CLIENT MODULE', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // INIT DB
    await startPostgresContainer();
    // INIT MODULE
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        getTypeORMModule(),
        BaseLocaleModule,
        TrustedClientModule,
        MailerModule,
      ],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
    // INIT REPOSITORY
    initTypeormRepository(app);
  });

  afterAll(async () => {
    await stopPostgresContainer();
    await app.close();
  });

  afterEach(async () => {
    await deleteRepositories();
  });

  describe('GET /trusted-client/communes/:codeCommune/bases-locales', () => {
    it('Return 403 without secret', async () => {
      await request(app.getHttpServer())
        .get(`/trusted-client/communes/91534/bases-locales`)
        .expect(403);
    });

    it('Return 403 with wrong secret', async () => {
      await request(app.getHttpServer())
        .get(`/trusted-client/communes/91534/bases-locales`)
        .set('x-client-secret', 'wrong-secret')
        .expect(403);
    });

    it('Return 403 with a BAL token instead of the secret', async () => {
      await request(app.getHttpServer())
        .get(`/trusted-client/communes/91534/bases-locales`)
        .set('authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('Return 404 with unknown commune', async () => {
      await request(app.getHttpServer())
        .get(`/trusted-client/communes/00000/bases-locales`)
        .set('x-client-secret', CLIENT_SECRET)
        .expect(404);
    });

    it('Return 200 with the BAL of the commune, token included', async () => {
      const balId = await createBal({
        nom: 'bal',
        commune: '91534',
        emails: ['mairie@saclay.fr'],
        status: StatusBaseLocalEnum.DRAFT,
      });
      // Autre commune : ne doit pas remonter
      await createBal({
        nom: 'bal',
        commune: '37003',
        status: StatusBaseLocalEnum.DRAFT,
      });
      // BAL supprimée : ne doit pas remonter
      await createBal({
        nom: 'bal',
        commune: '91534',
        status: StatusBaseLocalEnum.DRAFT,
        deletedAt: new Date(),
      });

      const response = await request(app.getHttpServer())
        .get(`/trusted-client/communes/91534/bases-locales`)
        .set('x-client-secret', CLIENT_SECRET)
        .set('x-acting-user', 'agent@saclay.fr')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].id).toEqual(balId);
      expect(response.body[0].token).toEqual(token);
      expect(response.body[0].emails).toEqual(['mairie@saclay.fr']);
    });
  });

  describe('Secret does not grant access to other routes', () => {
    it('PUT /bases-locales/:id with secret only return 403', async () => {
      const balId = await createBal({
        nom: 'bal',
        commune: '91534',
        status: StatusBaseLocalEnum.DRAFT,
      });

      await request(app.getHttpServer())
        .put(`/bases-locales/${balId}`)
        .set('x-client-secret', CLIENT_SECRET)
        .send({ nom: 'nouveau nom' })
        .expect(403);
    });
  });
});
