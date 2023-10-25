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
import { VoieController } from '../voie.controller';
import { NumeroService } from '@/modules/numeros/numero.service';
import { CreateNumeroDto } from '@/modules/numeros/dto/create_numero.dto';
import { Connection, connect, Model, Types } from 'mongoose';
import { Numero } from '@/modules/numeros/schema/numero.schema';
import { Voie } from '@/modules/voie/schema/voie.schema';
import { BaseLocale } from '@/modules/base_locale/schema/base_locale.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { DbModule } from '@/lib/modules/db.module';
import { getModelToken } from '@nestjs/mongoose';
import { VoieMiddleware } from '@/lib/middlewares/voie.middleware';
import { VoieService } from '@/modules/voie/voie.service';
import { TilesService } from '@/lib/services/tiles.services';
import { DbService } from '@/lib/services/db.service';

describe('Numero', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;
  let numeroModel: Model<Numero>;
  let voieModel: Model<Voie>;
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
      controllers: [VoieController],
      providers: [VoieMiddleware, VoieService],
    })
    class TestModule implements NestModule {
      configure(consumer: MiddlewareConsumer) {
        consumer.apply(VoieMiddleware).forRoutes(VoieController);
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

  describe('TEST VOIE', () => {
    it('test', async () => {
      expect(true).toBe(true);
    });
  });
});
