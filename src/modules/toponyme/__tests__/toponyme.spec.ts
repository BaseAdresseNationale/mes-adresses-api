import * as request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ValidationPipe } from '@nestjs/common';
import {
  INestApplication,
  Module,
  NestModule,
  MiddlewareConsumer,
} from '@nestjs/common';
import { ToponymeController } from '../toponyme.controller';
import { Connection, connect, Model, Types } from 'mongoose';
import { Numero } from '@/modules/numeros/schema/numero.schema';
import { Toponyme } from '@/modules/toponyme/schema/toponyme.schema';
import { Voie } from '@/modules/voie/schema/voie.schema';
import { BaseLocale } from '@/modules/base_locale/schema/base_locale.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { DbModule } from '@/lib/modules/db.module';
import { getModelToken } from '@nestjs/mongoose';
import { ToponymeMiddleware } from '@/lib/middlewares/toponyme.middleware';
import { ToponymeService } from '@/modules/toponyme/toponyme.service';

describe('Numero', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;
  let numeroModel: Model<Numero>;
  let voieModel: Model<Voie>;
  let toponymeModel: Model<Toponyme>;
  let balModel: Model<BaseLocale>;
  const token = 'xxxx';

  beforeAll(async () => {
    // INIT DB
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    mongoConnection = (await connect(uri)).connection;

    // INIT MODULE
    @Module({
      imports: [MongooseModule.forRoot(uri), DbModule],
      controllers: [ToponymeController],
      providers: [ToponymeMiddleware, ToponymeService],
    })
    class TestModule implements NestModule {
      configure(consumer: MiddlewareConsumer) {
        consumer.apply(ToponymeMiddleware).forRoutes(ToponymeController);
      }
    }
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [TestModule],
    }).compile();

    // INIT APP
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    // INIT MODEL
    numeroModel = app.get<Model<Numero>>(getModelToken(Numero.name));
    voieModel = app.get<Model<Voie>>(getModelToken(Voie.name));
    balModel = app.get<Model<BaseLocale>>(getModelToken(BaseLocale.name));
    toponymeModel = app.get<Model<Toponyme>>(getModelToken(Toponyme.name));
  });
  afterAll(async () => {
    await mongoConnection.dropDatabase();
    await mongoConnection.close();
    await mongod.stop();
  });

  afterEach(async () => {
    const collections = mongoConnection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  });

  async function createBal() {
    const balId = new Types.ObjectId();
    const bal: Partial<BaseLocale> = {
      _id: balId,
      token,
    };
    await balModel.create(bal);
    return balId;
  }

  async function createToponyme(props: Partial<Toponyme> = {}) {
    const toponymeId = new Types.ObjectId();
    const toponyme: Partial<Toponyme> = {
      _id: toponymeId,
      ...props,
    };
    await toponymeModel.create(toponyme);
    return toponymeId;
  }

  async function createVoie(props: Partial<Voie> = {}) {
    const voieId = new Types.ObjectId();
    const voie: Partial<Voie> = {
      _id: voieId,
      ...props,
    };
    await voieModel.create(voie);
    return voieId;
  }

  async function createNumero(
    _bal: Types.ObjectId,
    voie: Types.ObjectId,
    props: Partial<Numero> = {},
  ) {
    const numeroId = new Types.ObjectId();
    const numero: Partial<Numero> = {
      _id: numeroId,
      _bal,
      voie,
      ...props,
    };
    await numeroModel.create(numero);
    return numeroId;
  }

  describe('TEST TOPONYME', () => {
    it('test', async () => {
      expect(true).toBe(true);
    });
  });
});
