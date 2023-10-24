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
import { Toponyme } from '@/modules/toponyme/schema/toponyme.schema';
import { BaseLocale } from '@/modules/base_locale/schema/base_locale.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { NumeroMiddleware } from '@/lib/middlewares/numero.middleware';
import { ToponymeMiddleware } from '@/lib/middlewares/toponyme.middleware';
import { PositionTypeEnum } from '@/lib/schemas/position_type.enum';
import { UpdateNumeroDto } from '../dto/update_numero.dto';
import { DbModule } from '@/lib/modules/db.module';
import { TilesService } from '@/lib/services/tiles.services';
import { DbService } from '@/lib/services/db.service';

describe('Numero', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;
  let numeroModel: Model<Numero>;
  let voieModel: Model<Voie>;
  let balModel: Model<BaseLocale>;
  let toponymeModel: Model<Toponyme>;
  const token = 'xxxx';

  beforeAll(async () => {
    // INIT DB
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    mongoConnection = (await connect(uri)).connection;

    // INIT MODULE
    @Module({
      imports: [MongooseModule.forRoot(uri), DbModule],
      controllers: [NumeroController],
      providers: [NumeroMiddleware, NumeroService, TilesService, DbService],
    })
    class TestModule implements NestModule {
      configure(consumer: MiddlewareConsumer) {
        consumer
          .apply(NumeroMiddleware)
          .forRoutes(
            { path: 'numeros/:numeroId', method: RequestMethod.GET },
            { path: 'numeros/:numeroId', method: RequestMethod.PUT },
            { path: 'numeros/:numeroId', method: RequestMethod.DELETE },
            {
              path: 'numeros/:numeroId/soft-delete',
              method: RequestMethod.PUT,
            },
          )
          .apply(ToponymeMiddleware)
          .forRoutes({
            path: 'toponymes/:toponymeId/numeros',
            method: RequestMethod.GET,
          });
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

  async function createVoie(props: Partial<Voie> = {}) {
    const voieId = new Types.ObjectId();
    const voie: Partial<Voie> = {
      _id: voieId,
      ...props,
    };
    await voieModel.create(voie);
    return voieId;
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

  describe('GET /numero', () => {
    it('Return 200 numero', async () => {
      const balId = await createBal();
      const voieId = await createVoie({ nom: 'rue de la paix' });
      const numeroId = await createNumero(balId, voieId, { numero: 99 });

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
      const balId = await createBal();
      const voieId = await createVoie({ nom: 'rue de la paix' });
      const numeroId = await createNumero(balId, voieId, {
        numero: 99,
        comment: 'coucou',
      });

      const response = await request(app.getHttpServer())
        .get(`/numeros/${numeroId}`)
        .expect(200);
      expect(response.body.comment).toEqual(null);
    });

    it('Return 200 numero without comment', async () => {
      const balId = await createBal();
      const voieId = await createVoie({ nom: 'rue de la paix' });
      const numeroId = await createNumero(balId, voieId, {
        numero: 99,
        comment: 'coucou',
      });

      const response = await request(app.getHttpServer())
        .get(`/numeros/${numeroId}`)
        .set('token', token)
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
      const balId = await createBal();
      const voieId = await createVoie({ nom: 'rue de la paix' });
      const numeroId = await createNumero(balId, voieId, { numero: 99 });

      const updatedNumero: UpdateNumeroDto = {
        numero: 100,
      };

      const response = await request(app.getHttpServer())
        .put(`/numeros/${numeroId}`)
        .send(updatedNumero)
        .set('token', token)
        .expect(200);

      expect(response.body._id).toEqual(numeroId.toString());
      expect(response.body._bal).toEqual(balId.toString());
      expect(response.body.numero).toEqual(100);
      expect(response.body.voie).toEqual(voieId.toString());
      expect(response.body.parcelles).toEqual([]);
      expect(response.body.positions).toEqual([]);
      expect(response.body.voie).toEqual(voieId.toString());
    });

    it('Update 404 Numero Not Found', async () => {
      const updatedNumero: UpdateNumeroDto = {
        numero: 100,
      };

      const numeroId = new Types.ObjectId();
      await request(app.getHttpServer())
        .put(`/numeros/${numeroId}`)
        .send(updatedNumero)
        .set('token', token)
        .expect(404);
    });

    it('Update 404 Voie Not Found', async () => {
      const balId = await createBal();
      const voieId = await createVoie({ nom: 'rue de la paix' });
      const numeroId = await createNumero(balId, voieId, { numero: 99 });

      const updatedNumero: UpdateNumeroDto = {
        voie: new Types.ObjectId(),
      };

      await request(app.getHttpServer())
        .put(`/numeros/${numeroId}`)
        .send(updatedNumero)
        .set('token', token)
        .expect(404);
    });

    it('Update 404 Toponyme Not Found', async () => {
      const balId = await createBal();
      const voieId = await createVoie({ nom: 'rue de la paix' });
      const numeroId = await createNumero(balId, voieId, { numero: 99 });

      const updatedNumero: UpdateNumeroDto = {
        toponyme: new Types.ObjectId(),
      };

      await request(app.getHttpServer())
        .put(`/numeros/${numeroId}`)
        .send(updatedNumero)
        .set('token', token)
        .expect(404);
    });

    it('Update 403 Forbiden', async () => {
      const balId = await createBal();
      const voieId = await createVoie({ nom: 'rue de la paix' });
      const numeroId = await createNumero(balId, voieId, { numero: 99 });

      const updatedNumero: UpdateNumeroDto = {
        numero: 100,
      };

      await request(app.getHttpServer())
        .put(`/numeros/${numeroId}`)
        .send(updatedNumero)
        .expect(403);
    });

    it('Update 200 check field _updated of voie and bal', async () => {
      const balId = await createBal();
      const voieId = await createVoie({ nom: 'rue de la paix' });
      const numeroId = await createNumero(balId, voieId, { numero: 99 });

      const voieDbBefore = await voieModel.findOne({ _id: voieId });
      const balDbBefore = await balModel.findOne({ _id: balId });

      const updatedNumero: UpdateNumeroDto = {
        numero: 100,
      };

      await request(app.getHttpServer())
        .put(`/numeros/${numeroId}`)
        .send(updatedNumero)
        .set('token', token)
        .expect(200);

      const voieDbAfter = await voieModel.findOne({ _id: voieId });
      const balDbAfter = await balModel.findOne({ _id: balId });

      expect(voieDbBefore._updated).not.toEqual(voieDbAfter._updated);
      expect(balDbBefore._updated).not.toEqual(balDbAfter._updated);
    });

    it('Update 200 check field _updated is UPDATE', async () => {
      const balId = await createBal();
      const voieId = await createVoie({ nom: 'rue de la paix' });
      const numeroId = await createNumero(balId, voieId, { numero: 99 });

      const numeroDbBefore = await numeroModel.findOne({ _id: numeroId });
      const voieDbBefore = await voieModel.findOne({ _id: voieId });
      const balDbBefore = await balModel.findOne({ _id: balId });

      const updatedNumero: UpdateNumeroDto = {
        numero: 100,
      };

      await request(app.getHttpServer())
        .put(`/numeros/${numeroId}`)
        .send(updatedNumero)
        .set('token', token)
        .expect(200);

      const numeroDbAfter = await numeroModel.findOne({ _id: numeroId });
      const voieDbAfter = await voieModel.findOne({ _id: voieId });
      const balDbAfter = await balModel.findOne({ _id: balId });

      expect(numeroDbBefore._updated).not.toEqual(numeroDbAfter._updated);
      expect(voieDbBefore._updated).not.toEqual(voieDbAfter._updated);
      expect(balDbBefore._updated).not.toEqual(balDbAfter._updated);
    });

    it('Update 200 check field tiles Numero is UPDATE and centroid, centroidTiles voie is UPDATE', async () => {
      const balId = await createBal();
      const voieId = await createVoie({ nom: 'rue de la paix' });
      const numeroId = await createNumero(balId, voieId, { numero: 99 });

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
        .set('token', token)
        .expect(200);

      const numeroDbAfter = await numeroModel.findOne({ _id: numeroId });
      const voieDbAfter = await voieModel.findOne({ _id: voieId });
      expect(numeroDbBefore.tiles).not.toEqual(numeroDbAfter.tiles);
      expect(voieDbBefore.centroid).not.toEqual(voieDbAfter.centroid);
      expect(voieDbBefore.centroidTiles).not.toEqual(voieDbAfter.centroidTiles);
    });

    it('Update 200 replace voie', async () => {
      const balId = await createBal();
      const voieId1 = await createVoie({ nom: 'rue de la paix' });
      const voieId2 = await createVoie({ nom: 'rue de la paix' });
      const numeroId = await createNumero(balId, voieId1, {
        numero: 99,
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
      });

      const voie1DbBefore: Voie = await voieModel.findOne({ _id: voieId1 });

      const updatedNumero: UpdateNumeroDto = {
        voie: voieId2,
      };

      await request(app.getHttpServer())
        .put(`/numeros/${numeroId}`)
        .send(updatedNumero)
        .set('token', token)
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

  describe('DELETE /numero', () => {
    it('Delete 204 numero', async () => {
      const balId = await createBal();
      const voieId = await createVoie({ nom: 'rue de la paix' });
      const numeroId = await createNumero(balId, voieId, { numero: 99 });

      await request(app.getHttpServer())
        .delete(`/numeros/${numeroId}`)
        .set('token', token)
        .expect(204);

      const numeroDeleted: Numero = await numeroModel.findOne({
        _id: numeroId,
      });

      expect(numeroDeleted).toBe(null);
    });

    it('Delete 404 NOT FOUND', async () => {
      const numeroId = new Types.ObjectId();
      await request(app.getHttpServer())
        .delete(`/numeros/${numeroId}`)
        .set('token', token)
        .expect(404);
    });

    it('Delete 403 FORBIDEN', async () => {
      const balId = await createBal();
      const voieId = await createVoie({ nom: 'rue de la paix' });
      const numeroId = await createNumero(balId, voieId, { numero: 99 });

      await request(app.getHttpServer())
        .delete(`/numeros/${numeroId}`)
        .expect(403);

      const numeroDeleted: Numero = await numeroModel.findOne({
        _id: numeroId,
      });

      expect(numeroDeleted).not.toBe(null);
    });
  });

  describe('SOFT DELETE /numero', () => {
    it('Soft Delete 200 numero', async () => {
      const balId = await createBal();
      const voieId = await createVoie({ nom: 'rue de la paix' });
      const numeroId = await createNumero(balId, voieId, { numero: 99 });

      await request(app.getHttpServer())
        .put(`/numeros/${numeroId}/soft-delete`)
        .set('token', token)
        .expect(200);

      const numeroDeleted: Numero = await numeroModel.findOne({
        _id: numeroId,
      });

      expect(numeroDeleted._deleted).not.toBe(null);
    });

    it('Soft Delete 404 NOT FOUND', async () => {
      const numeroId = new Types.ObjectId();
      await request(app.getHttpServer())
        .put(`/numeros/${numeroId}/soft-delete`)
        .set('token', token)
        .expect(404);
    });

    it('Soft Delete 403 FORBIDEN', async () => {
      const balId = await createBal();
      const voieId = await createVoie({ nom: 'rue de la paix' });
      const numeroId = await createNumero(balId, voieId, {
        numero: 99,
        _deleted: null,
      });

      await request(app.getHttpServer())
        .put(`/numeros/${numeroId}/soft-delete`)
        .expect(403);

      const numeroDeleted: Numero = await numeroModel.findOne({
        _id: numeroId,
      });
      expect(numeroDeleted._deleted).toBe(null);
    });
  });

  describe('GET /toponymes/numeros', () => {
    it('Return 200 numero without comment', async () => {
      const balId = await createBal();
      const toponymeId = await createToponyme({ nom: 'allée', _bal: balId });
      const voieId = await createVoie({ nom: 'rue de la paix', _bal: balId });
      await createNumero(balId, voieId, {
        numero: 1,
        comment: 'coucou',
        toponyme: toponymeId,
      });
      await createNumero(balId, voieId, {
        numero: 1,
        comment: 'coucou',
        toponyme: toponymeId,
      });

      const response = await request(app.getHttpServer())
        .get(`/toponymes/${toponymeId}/numeros`)
        .expect(200);

      expect(response.body.length).toEqual(2);
      expect(response.body[0].numero).toEqual(1);
      expect(response.body[1].numero).toEqual(1);
      expect(response.body[0].comment).toBeNull();
      expect(response.body[1].comment).toBeNull();
      expect(response.body[0].voie._id).toEqual(voieId.toString());
      expect(response.body[1].voie._id).toEqual(voieId.toString());
    });

    it('Return 200 numero with comment', async () => {
      const balId = await createBal();
      const toponymeId = await createToponyme({ nom: 'allée', _bal: balId });
      const voieId = await createVoie({ nom: 'rue de la paix', _bal: balId });
      await createNumero(balId, voieId, {
        numero: 1,
        comment: 'coucou',
        toponyme: toponymeId,
      });
      await createNumero(balId, voieId, {
        numero: 1,
        comment: 'coucou',
        toponyme: toponymeId,
      });

      const response = await request(app.getHttpServer())
        .get(`/toponymes/${toponymeId}/numeros`)
        .set('Token', token)
        .expect(200);

      expect(response.body.length).toEqual(2);
      expect(response.body[0].numero).toEqual(1);
      expect(response.body[1].numero).toEqual(1);
      expect(response.body[0].comment).toEqual('coucou');
      expect(response.body[1].comment).toEqual('coucou');
      expect(response.body[0].voie._id).toEqual(voieId.toString());
      expect(response.body[1].voie._id).toEqual(voieId.toString());
    });
  });
});
