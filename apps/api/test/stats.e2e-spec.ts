import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Connection, connect, Model, Types } from 'mongoose';

import { BaseLocale } from '@/shared/schemas/base_locale/base_locale.schema';
import { StatusBaseLocalEnum } from '@/shared/schemas/base_locale/status.enum';

import { StatsModule } from '@/modules/stats/stats.module';
import { CodeCommuneDTO } from '@/modules/stats/dto/code_commune.dto';

describe('TOPONYME MODULE', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;
  let balModel: Model<BaseLocale>;
  const token = 'xxxx';

  beforeAll(async () => {
    // INIT DB
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    mongoConnection = (await connect(uri)).connection;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [MongooseModule.forRoot(uri), StatsModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    // INIT MODEL
    balModel = app.get<Model<BaseLocale>>(getModelToken(BaseLocale.name));
  });

  afterAll(async () => {
    await mongoConnection.dropDatabase();
    await mongoConnection.close();
    await mongod.stop();
    await app.close();
  });

  afterEach(async () => {
    await balModel.deleteMany({});
  });

  async function createBal(props: Partial<BaseLocale> = {}) {
    const balId = new Types.ObjectId();
    const bal: Partial<BaseLocale> = {
      _id: balId,
      token,
      ...props,
    };
    await balModel.create(bal);
    return balId;
  }

  describe('GET /stats/bals', () => {
    it('Return 200', async () => {
      await createBal({
        commune: '54084',
        _created: new Date('2019-01-01'),
        status: StatusBaseLocalEnum.READY_TO_PUBLISH,
      });
      const balId1 = await createBal({
        commune: '37003',
        _created: new Date('2019-01-02'),
        status: StatusBaseLocalEnum.DRAFT,
      });
      const balId2 = await createBal({
        commune: '37003',
        _created: new Date('2019-01-03'),
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
          _id: balId1.toString(),
          commune: '37003',
          status: StatusBaseLocalEnum.DRAFT,
        },
        {
          _id: balId2.toString(),
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
        commune: '54084',
        _created: new Date('2019-01-01'),
        status: StatusBaseLocalEnum.READY_TO_PUBLISH,
      });
      await createBal({
        commune: '37003',
        _created: new Date('2019-01-02'),
        status: StatusBaseLocalEnum.DRAFT,
      });
      await createBal({
        commune: '37003',
        _created: new Date('2019-01-03'),
        status: StatusBaseLocalEnum.PUBLISHED,
      });

      const response = await request(app.getHttpServer())
        .get(`/stats/bals/status`)
        .expect(200);

      const expectedRes = [
        {
          status: StatusBaseLocalEnum.DRAFT,
          count: 1,
        },
        {
          status: StatusBaseLocalEnum.READY_TO_PUBLISH,
          count: 1,
        },
        {
          status: StatusBaseLocalEnum.PUBLISHED,
          count: 1,
        },
      ];

      expect(response.body).toContainEqual(expectedRes[0]);
      expect(response.body).toContainEqual(expectedRes[1]);
      expect(response.body).toContainEqual(expectedRes[2]);
    });
  });

  describe('GET /stats/bals/creations', () => {
    it('Return 200', async () => {
      await createBal({
        commune: '54084',
        _created: new Date('2019-01-01'),
        status: StatusBaseLocalEnum.READY_TO_PUBLISH,
      });
      await createBal({
        commune: '37003',
        _created: new Date('2019-01-02'),
        status: StatusBaseLocalEnum.DRAFT,
      });
      await createBal({
        commune: '37003',
        _created: new Date('2019-01-02'),
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
              draft: 0,
              readyToPublish: 1,
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
              readyToPublish: 0,
              demo: 0,
            },
          },
        },
      ];

      expect(response.body).toEqual(expectedRes);
    });
  });
});
