import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';

import { StatusBaseLocalEnum } from '@/shared/entities/base_locale.entity';

import { StatsModule } from '@/modules/stats/stats.module';
import { CodeCommuneDTO } from '@/modules/stats/dto/code_commune.dto';
import { MailerModule } from '@/shared/test/mailer.module.test';
import {
  createBal,
  deleteRepositories,
  getTypeORMModule,
  initTypeormRepository,
  startPostgresContainer,
  stopPostgresContainer,
} from './typeorm.utils';

describe('STATS MODULE', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // INIT DB
    await startPostgresContainer();
    // INIT MODULE
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [getTypeORMModule(), StatsModule, MailerModule],
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

  describe('GET /stats/bals', () => {
    it('Return 200', async () => {
      await createBal({
        nom: 'bal',
        commune: '54084',
        createdAt: new Date('2019-01-01'),
        status: StatusBaseLocalEnum.DRAFT,
      });
      const balId1 = await createBal({
        nom: 'bal',
        commune: '37003',
        createdAt: new Date('2019-01-02'),
        status: StatusBaseLocalEnum.DRAFT,
      });
      const balId2 = await createBal({
        nom: 'bal',
        commune: '37003',
        createdAt: new Date('2019-01-03'),
        status: StatusBaseLocalEnum.PUBLISHED,
      });

      const body: CodeCommuneDTO = {
        codeCommunes: ['37003'],
      };

      const response = await request(app.getHttpServer())
        .post(`/stats/bals?fields=commune&&fields=status`)
        .send(body)
        .expect(200);

      const expectedRes = [
        {
          id: balId1,
          commune: '37003',
          communeNom: 'Amboise',
          status: StatusBaseLocalEnum.DRAFT,
        },
        {
          id: balId2,
          commune: '37003',
          communeNom: 'Amboise',
          status: StatusBaseLocalEnum.PUBLISHED,
        },
      ];

      expect(response.body).toEqual(expectedRes);
    });
  });

  describe('GET /stats/bals/status', () => {
    it('Return 200', async () => {
      await createBal({
        nom: 'bal',
        commune: '54084',
        createdAt: new Date('2019-01-01'),
        status: StatusBaseLocalEnum.DRAFT,
      });
      await createBal({
        nom: 'bal',
        commune: '37003',
        createdAt: new Date('2019-01-02'),
        status: StatusBaseLocalEnum.DRAFT,
      });
      await createBal({
        nom: 'bal',
        commune: '37003',
        createdAt: new Date('2019-01-03'),
        status: StatusBaseLocalEnum.PUBLISHED,
      });

      const response = await request(app.getHttpServer())
        .get(`/stats/bals/status`)
        .expect(200);

      const expectedRes = [
        {
          status: StatusBaseLocalEnum.DRAFT,
          count: 2,
        },
        {
          status: StatusBaseLocalEnum.PUBLISHED,
          count: 1,
        },
      ];
      expect(response.body).toContainEqual(expectedRes[0]);
      expect(response.body).toContainEqual(expectedRes[1]);
    });
  });

  describe('GET /stats/bals/creations', () => {
    it('Return 200', async () => {
      await createBal({
        nom: 'bal',
        commune: '54084',
        createdAt: new Date('2019-01-01'),
        status: StatusBaseLocalEnum.DRAFT,
      });
      await createBal({
        nom: 'bal',
        commune: '37003',
        createdAt: new Date('2019-01-02'),
        status: StatusBaseLocalEnum.DRAFT,
      });
      await createBal({
        nom: 'bal',
        commune: '37003',
        createdAt: new Date('2019-01-02'),
        status: StatusBaseLocalEnum.PUBLISHED,
      });

      const response = await request(app.getHttpServer())
        .get(`/stats/bals/creations?from=2019-01-01&to=2019-01-02`)
        .expect(200);

      const expectedRes = [
        {
          date: '2019-01-01',
          createdBAL: {
            54084: {
              total: 1,
              published: 0,
              draft: 1,
              demo: 0,
            },
          },
        },
        {
          date: '2019-01-02',
          createdBAL: {
            37003: {
              total: 2,
              published: 1,
              draft: 1,
              demo: 0,
            },
          },
        },
      ];

      expect(response.body).toEqual(expectedRes);
    });
  });
});
