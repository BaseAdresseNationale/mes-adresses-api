import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { Client } from 'pg';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { v4 as uuid } from 'uuid';

import { Numero } from '@/shared/entities/numero.entity';
import { Voie } from '@/shared/entities/voie.entity';
import { Toponyme } from '@/shared/entities/toponyme.entity';
import {
  BaseLocale,
  StatusBaseLocalEnum,
} from '@/shared/entities/base_locale.entity';
import { Position } from '@/shared/entities/position.entity';

import { StatsModule } from '@/modules/stats/stats.module';
import { CodeCommuneDTO } from '@/modules/stats/dto/code_commune.dto';
import { MailerModule } from '@/shared/test/mailer.module.test';
import { Repository } from 'typeorm';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';

describe('STATS MODULE', () => {
  let app: INestApplication;
  // DB
  let postgresContainer: StartedPostgreSqlContainer;
  let postgresClient: Client;
  let balRepository: Repository<BaseLocale>;
  // VAR
  const token = 'xxxx';
  const createdAt = new Date('2000-01-01');
  const updatedAt = new Date('2000-01-02');

  beforeAll(async () => {
    // INIT DB
    postgresContainer = await new PostgreSqlContainer(
      'postgis/postgis:12-3.0',
    ).start();
    postgresClient = new Client({
      host: postgresContainer.getHost(),
      port: postgresContainer.getPort(),
      database: postgresContainer.getDatabase(),
      user: postgresContainer.getUsername(),
      password: postgresContainer.getPassword(),
    });
    await postgresClient.connect();
    // INIT MODULE
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: postgresContainer.getHost(),
          port: postgresContainer.getPort(),
          username: postgresContainer.getUsername(),
          password: postgresContainer.getPassword(),
          database: postgresContainer.getDatabase(),
          synchronize: true,
          entities: [BaseLocale, Voie, Numero, Toponyme, Position],
        }),
        StatsModule,
        MailerModule,
      ],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
    // INIT REPOSITORY
    balRepository = app.get(getRepositoryToken(BaseLocale));
  });

  afterAll(async () => {
    await postgresClient.end();
    await postgresContainer.stop();
    await app.close();
  });

  afterEach(async () => {
    await balRepository.delete({});
  });

  async function createBal(props: Partial<BaseLocale> = {}) {
    const payload: Partial<BaseLocale> = {
      banId: uuid(),
      createdAt,
      updatedAt,
      status: props.status ?? StatusBaseLocalEnum.DRAFT,
      token,
      ...props,
    };
    const entityToInsert = balRepository.create(payload);
    const result = await balRepository.save(entityToInsert);
    return result.id;
  }

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
          status: StatusBaseLocalEnum.DRAFT,
        },
        {
          id: balId2,
          commune: '37003',
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
