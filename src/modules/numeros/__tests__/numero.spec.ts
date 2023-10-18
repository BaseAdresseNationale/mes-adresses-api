import * as request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import {
  INestApplication,
  Module,
  NestModule,
  MiddlewareConsumer,
  RequestMethod,
} from '@nestjs/common';
import { NumeroController } from '../numero.controller';
import { NumeroService } from '../numero.service';
import { Connection, connect, Model, Types } from 'mongoose';
import { Numero } from '../schema/numero.schema';
import { Voie } from '@/modules/voie/schema/voie.schema';
import { BaseLocale } from '@/modules/base_locale/schema/base_locale.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { DbModelFactory } from '@/lib/model_factory/db.model.factory';
import { getModelToken } from '@nestjs/mongoose';
import { NumeroMiddleware } from '@/lib/middlewares/numero.middleware';
import { PositionTypeEnum } from '@/lib/schemas/position_type.enum';
import { UpdateNumeroDto } from '../dto/update_numero.dto';

describe('Numero', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;
  let numeroModel: Model<Numero>;
  let voieModel: Model<Voie>;
  let balModel: Model<BaseLocale>;

  beforeAll(async () => {
    // INIT DB
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    mongoConnection = (await connect(uri)).connection;

    // INIT MODULE
    @Module({
      imports: [
        MongooseModule.forRoot(uri),
        MongooseModule.forFeatureAsync(DbModelFactory),
      ],
      controllers: [NumeroController],
      providers: [NumeroMiddleware, NumeroService],
    })
    class TestModule implements NestModule {
      configure(consumer: MiddlewareConsumer) {
        consumer
          .apply(NumeroMiddleware)
          .forRoutes({ path: 'numeros/:numeroId', method: RequestMethod.ALL });
      }
    }
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [TestModule],
    }).compile();

    // INIT APP
    app = moduleRef.createNestApplication();
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

  describe('GET /numero', () => {
    it('Return 200 numero', async () => {
      const balId = new Types.ObjectId();
      const bal: Partial<BaseLocale> = {
        _id: balId,
        token: 'xxxx',
      };
      await balModel.create(bal);

      const voieId = new Types.ObjectId();
      const voie: Partial<Voie> = {
        _id: voieId,
        nom: 'rue de la paix',
      };
      await voieModel.create(voie);

      const numeroId = new Types.ObjectId();
      const numero: Partial<Numero> = {
        _id: numeroId,
        _bal: balId,
        numero: 99,
        voie: voieId,
      };
      await numeroModel.create(numero);

      const response = await request(app.getHttpServer())
        .get(`/numeros/${numeroId}`)
        .expect(200);
      expect(response.body._id).toEqual(numeroId.toString());
      expect(response.body._bal).toEqual(balId.toString());
      expect(response.body.numero).toEqual(99);
      expect(response.body.voie).toEqual(voieId.toString());
      expect(response.body.parcelles).toEqual([]);
      expect(response.body.positions).toEqual([]);
      expect(response.body.voie).toEqual(voieId.toString());
    });

    it('Return 200 numero without comment', async () => {
      const balId = new Types.ObjectId();
      const bal: Partial<BaseLocale> = {
        _id: balId,
        token: 'xxxx',
      };
      await balModel.create(bal);

      const voieId = new Types.ObjectId();
      const voie: Partial<Voie> = {
        _id: voieId,
        nom: 'rue de la paix',
      };
      await voieModel.create(voie);

      const numeroId = new Types.ObjectId();
      const numero: Partial<Numero> = {
        _id: numeroId,
        _bal: balId,
        numero: 99,
        voie: voieId,
        comment: 'coucou',
      };
      await numeroModel.create(numero);

      const response = await request(app.getHttpServer())
        .get(`/numeros/${numeroId}`)
        .expect(200);
      expect(response.body.comment).toEqual(null);
    });

    it('Return 200 numero without comment', async () => {
      const balId = new Types.ObjectId();
      const bal: Partial<BaseLocale> = {
        _id: balId,
        token: 'xxxx',
      };
      await balModel.create(bal);

      const voieId = new Types.ObjectId();
      const voie: Partial<Voie> = {
        _id: voieId,
        nom: 'rue de la paix',
      };
      await voieModel.create(voie);

      const numeroId = new Types.ObjectId();
      const numero: Partial<Numero> = {
        _id: numeroId,
        _bal: balId,
        numero: 99,
        voie: voieId,
        comment: 'coucou',
      };
      await numeroModel.create(numero);

      const response = await request(app.getHttpServer())
        .get(`/numeros/${numeroId}`)
        .set('token', 'xxxx')
        .expect(200);
      expect(response.body.comment).toEqual('coucou');
    });

    it('Return 404', async () => {
      const numeroId = new Types.ObjectId();
      await request(app.getHttpServer())
        .get(`/numeros/${numeroId}`)
        .expect(404);
    });
  });

  describe('PUT /numero', () => {
    it('Update 200 numero', async () => {
      const balId = new Types.ObjectId();
      const bal: Partial<BaseLocale> = {
        _id: balId,
        token: 'xxxx',
      };
      await balModel.create(bal);

      const voieId = new Types.ObjectId();
      const voie: Partial<Voie> = {
        _id: voieId,
        nom: 'rue de la paix',
      };
      await voieModel.create(voie);

      const numeroId = new Types.ObjectId();
      const numero: Partial<Numero> = {
        _id: numeroId,
        _bal: balId,
        numero: 99,
        voie: voieId,
      };
      await numeroModel.create(numero);

      const updatedNumero: UpdateNumeroDto = {
        numero: 100,
      };

      const response = await request(app.getHttpServer())
        .put(`/numeros/${numeroId}`)
        .send(updatedNumero)
        .set('token', 'xxxx')
        .expect(200);

      expect(response.body._id).toEqual(numeroId.toString());
      expect(response.body._bal).toEqual(balId.toString());
      expect(response.body.numero).toEqual(100);
      expect(response.body.voie).toEqual(voieId.toString());
      expect(response.body.parcelles).toEqual([]);
      expect(response.body.positions).toEqual([]);
      expect(response.body.voie).toEqual(voieId.toString());
    });

    it('Update 404 Not Found', async () => {
      const updatedNumero: UpdateNumeroDto = {
        numero: 100,
      };

      const numeroId = new Types.ObjectId();
      await request(app.getHttpServer())
        .put(`/numeros/${numeroId}`)
        .send(updatedNumero)
        .set('token', 'xxxx')
        .expect(404);
    });

    it('Update 403 Forbiden', async () => {
      const balId = new Types.ObjectId();
      const bal: Partial<BaseLocale> = {
        _id: balId,
        token: 'xxxx',
      };
      await balModel.create(bal);

      const voieId = new Types.ObjectId();
      const voie: Partial<Voie> = {
        _id: voieId,
        nom: 'rue de la paix',
      };
      await voieModel.create(voie);

      const numeroId = new Types.ObjectId();
      const numero: Partial<Numero> = {
        _id: numeroId,
        _bal: balId,
        numero: 99,
        voie: voieId,
      };
      await numeroModel.create(numero);

      const updatedNumero: UpdateNumeroDto = {
        numero: 100,
      };

      await request(app.getHttpServer())
        .put(`/numeros/${numeroId}`)
        .send(updatedNumero)
        .expect(403);
    });

    it('Update 200 check field _updated of voie and bal', async () => {
      const balId = new Types.ObjectId();
      const bal: Partial<BaseLocale> = {
        _id: balId,
        token: 'xxxx',
      };
      await balModel.create(bal);

      const voieId = new Types.ObjectId();
      const voie: Partial<Voie> = {
        _id: voieId,
        nom: 'rue de la paix',
      };
      await voieModel.create(voie);

      const numeroId = new Types.ObjectId();
      const numero: Partial<Numero> = {
        _id: numeroId,
        _bal: balId,
        numero: 99,
        voie: voieId,
      };
      await numeroModel.create(numero);

      const voieDbBefore = await voieModel.findOne({ _id: voieId });
      const balDbBefore = await balModel.findOne({ _id: balId });

      const updatedNumero: UpdateNumeroDto = {
        numero: 100,
      };

      await request(app.getHttpServer())
        .put(`/numeros/${numeroId}`)
        .send(updatedNumero)
        .set('token', 'xxxx')
        .expect(200);

      const voieDbAfter = await voieModel.findOne({ _id: voieId });
      const balDbAfter = await balModel.findOne({ _id: balId });

      expect(voieDbBefore._updated).not.toEqual(voieDbAfter._updated);
      expect(balDbBefore._updated).not.toEqual(balDbAfter._updated);
    });

    it('Update 200 check field _updated is UPDATE', async () => {
      const balId = new Types.ObjectId();
      const bal: Partial<BaseLocale> = {
        _id: balId,
        token: 'xxxx',
      };
      await balModel.create(bal);

      const voieId = new Types.ObjectId();
      const voie: Partial<Voie> = {
        _id: voieId,
        nom: 'rue de la paix',
      };
      await voieModel.create(voie);

      const numeroId = new Types.ObjectId();
      const numero: Partial<Numero> = {
        _id: numeroId,
        _bal: balId,
        numero: 99,
        voie: voieId,
      };
      await numeroModel.create(numero);

      const numeroDbBefore = await numeroModel.findOne({ _id: numeroId });
      const voieDbBefore = await voieModel.findOne({ _id: voieId });
      const balDbBefore = await balModel.findOne({ _id: balId });

      const updatedNumero: UpdateNumeroDto = {
        numero: 100,
      };

      await request(app.getHttpServer())
        .put(`/numeros/${numeroId}`)
        .send(updatedNumero)
        .set('token', 'xxxx')
        .expect(200);

      const numeroDbAfter = await numeroModel.findOne({ _id: numeroId });
      const voieDbAfter = await voieModel.findOne({ _id: voieId });
      const balDbAfter = await balModel.findOne({ _id: balId });

      expect(numeroDbBefore._updated).not.toEqual(numeroDbAfter._updated);
      expect(voieDbBefore._updated).not.toEqual(voieDbAfter._updated);
      expect(balDbBefore._updated).not.toEqual(balDbAfter._updated);
    });

    it('Update 200 check field tiles Numero is UPDATE and centroid, centroidTiles voie is UPDATE', async () => {
      const balId = new Types.ObjectId();
      const bal: Partial<BaseLocale> = {
        _id: balId,
        token: 'xxxx',
      };
      await balModel.create(bal);

      const voieId = new Types.ObjectId();
      const voie: Partial<Voie> = {
        _id: voieId,
        nom: 'rue de la paix',
      };
      await voieModel.create(voie);

      const numeroId = new Types.ObjectId();
      const numero: Partial<Numero> = {
        _id: numeroId,
        _bal: balId,
        numero: 99,
        voie: voieId,
      };
      await numeroModel.create(numero);

      const numeroDbBefore = await numeroModel.findOne({ _id: numeroId });
      const voieDbBefore = await voieModel.findOne({ _id: voieId });

      const updatedNumero: UpdateNumeroDto = {
        positions: [
          {
            type: PositionTypeEnum.ICONNUE,
            source: 'ban',
            point: {
              type: 'Point',
              coordinates: [8, 42],
            },
          },
        ],
      };

      await request(app.getHttpServer())
        .put(`/numeros/${numeroId}`)
        .send(updatedNumero)
        .set('token', 'xxxx')
        .expect(200);

      const numeroDbAfter = await numeroModel.findOne({ _id: numeroId });
      const voieDbAfter = await voieModel.findOne({ _id: voieId });
      expect(numeroDbBefore.tiles).not.toEqual(numeroDbAfter.tiles);
      expect(voieDbBefore.centroid).not.toEqual(voieDbAfter.centroid);
      expect(voieDbBefore.centroidTiles).not.toEqual(voieDbAfter.centroidTiles);
    });

    it('Update 200 replace voie', async () => {
      const balId = new Types.ObjectId();
      const bal: Partial<BaseLocale> = {
        _id: balId,
        token: 'xxxx',
      };
      await balModel.create(bal);

      const voieId1 = new Types.ObjectId();
      const voie1: Partial<Voie> = {
        _id: voieId1,
        nom: 'rue de la paix',
      };
      await voieModel.create(voie1);

      const voieId2 = new Types.ObjectId();
      const voie2: Partial<Voie> = {
        _id: voieId2,
        nom: 'rue de Paris',
      };
      await voieModel.create(voie2);

      const numeroId = new Types.ObjectId();
      const numero: Partial<Numero> = {
        _id: numeroId,
        _bal: balId,
        numero: 99,
        voie: voieId1,
        positions: [
          {
            type: PositionTypeEnum.ICONNUE,
            source: 'ban',
            point: {
              type: 'Point',
              coordinates: [8, 42],
            },
          },
        ],
      };
      await numeroModel.create(numero);

      const voie1DbBefore: Voie = await voieModel.findOne({ _id: voieId1 });

      const updatedNumero: UpdateNumeroDto = {
        voie: voieId2,
      };

      await request(app.getHttpServer())
        .put(`/numeros/${numeroId}`)
        .send(updatedNumero)
        .set('token', 'xxxx')
        .expect(200);

      const voie1DbAfter: Voie = await voieModel.findOne({ _id: voieId1 });
      const voie2DbAfter: Voie = await voieModel.findOne({ _id: voieId2 });

      expect(voie1DbBefore.centroid).not.toBe(null);
      expect(voie1DbBefore.centroidTiles).not.toBe(null);
      expect(voie1DbAfter.centroid).toBe(null);
      expect(voie1DbAfter.centroidTiles).toBe(null);
      expect(voie2DbAfter.centroid).not.toBe(null);
      expect(voie2DbAfter.centroidTiles).not.toBe(null);
    });
  });
});
