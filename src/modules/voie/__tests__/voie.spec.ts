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
import { DbModelFactory } from '@/lib/model_factory/db.model.factory';
import { getModelToken } from '@nestjs/mongoose';
import { VoieMiddleware } from '@/lib/middlewares/voie.middleware';
import { PositionTypeEnum } from '@/lib/schemas/position_type.enum';

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
      imports: [
        MongooseModule.forRoot(uri),
        MongooseModule.forFeatureAsync(DbModelFactory),
      ],
      controllers: [VoieController],
      providers: [VoieMiddleware, NumeroService],
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

  describe('GET /voies/numeros', () => {
    it('Return 200 numero without comment', async () => {
      const balId = await createBal();
      const voieId = await createVoie({ nom: 'rue de la paix', _bal: balId });
      const numeroId1 = await createNumero(balId, voieId, {
        numero: 1,
        comment: 'coucou',
      });

      const response = await request(app.getHttpServer())
        .get(`/voies/${voieId}/numeros`)
        .expect(200);
      expect(response.body.length).toEqual(1);
      expect(response.body[0]._id).toEqual(numeroId1.toString());
      expect(response.body[0].comment).toEqual(null);
    });

    it('Return 200 numero with comment', async () => {
      const balId = await createBal();
      const voieId = await createVoie({ nom: 'rue de la paix', _bal: balId });
      const numeroId1 = await createNumero(balId, voieId, {
        numero: 1,
        comment: 'coucou',
      });

      const response = await request(app.getHttpServer())
        .get(`/voies/${voieId}/numeros`)
        .set('token', token)
        .expect(200);
      expect(response.body.length).toEqual(1);
      expect(response.body[0]._id).toEqual(numeroId1.toString());
      expect(response.body[0].comment).toEqual('coucou');
    });
  });

  describe('POST /voies/numeros', () => {
    it('Create 201 numero', async () => {
      const balId = await createBal();
      const voieId = await createVoie({ nom: 'rue de la paix', _bal: balId });
      const createdNumero: CreateNumeroDto = {
        numero: 1,
        positions: [
          {
            type: PositionTypeEnum.ENTREE,
            source: 'ban',
            point: {
              type: 'Point',
              coordinates: [8, 42],
            },
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post(`/voies/${voieId}/numeros`)
        .send(createdNumero)
        .set('token', token)
        .expect(201);

      expect(response.body.numero).toEqual(1);
      expect(response.body._bal).toEqual(balId.toString());
      expect(response.body.voie).toEqual(voieId.toString());
      expect(response.body.parcelles).toEqual([]);
      expect(response.body.positions).not.toBeNull();
      expect(response.body.tiles).not.toBeNull();
      expect(response.body.suffixe).toEqual(null);
      expect(response.body.toponyme).toEqual(null);
      expect(response.body.comment).toEqual(null);
      expect(response.body.certifie).toEqual(false);
      expect(response.body._updated).not.toBeNull();
      expect(response.body._created).not.toBeNull();
      expect(response.body._deleted).toEqual(null);
    });

    it('Create 201 numero with meta', async () => {
      const balId = await createBal();
      const voieId = await createVoie({ nom: 'rue de la paix', _bal: balId });
      const createdNumero: CreateNumeroDto = {
        numero: 1,
        suffixe: 'bis',
        parcelles: ['97613000AS0120'],
        comment: 'coucou',
        certifie: true,
        positions: [
          {
            type: PositionTypeEnum.ENTREE,
            source: 'ban',
            point: {
              type: 'Point',
              coordinates: [8, 42],
            },
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post(`/voies/${voieId}/numeros`)
        .send(createdNumero)
        .set('token', token)
        .expect(201);

      expect(response.body.numero).toEqual(1);
      expect(response.body._bal).toEqual(balId.toString());
      expect(response.body.voie).toEqual(voieId.toString());
      expect(response.body.parcelles).toEqual(['97613000AS0120']);
      expect(response.body.positions).not.toBeNull();
      expect(response.body.tiles).not.toBeNull();
      expect(response.body.suffixe).toEqual('bis');
      expect(response.body.toponyme).toEqual(null);
      expect(response.body.comment).toEqual('coucou');
      expect(response.body.certifie).toEqual(true);
      expect(response.body._updated).not.toBeNull();
      expect(response.body._created).not.toBeNull();
      expect(response.body._deleted).toEqual(null);
    });

    it('Create 404 voie is deleted', async () => {
      const balId = await createBal();
      const voieId = await createVoie({
        nom: 'rue de la paix',
        _bal: balId,
        _deleted: new Date(),
      });
      const createdNumero: CreateNumeroDto = {
        numero: 1,
        positions: [
          {
            type: PositionTypeEnum.ENTREE,
            source: 'ban',
            point: {
              type: 'Point',
              coordinates: [8, 42],
            },
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post(`/voies/${voieId}/numeros`)
        .send(createdNumero)
        .set('token', token)
        .expect(404);

      expect(response.text).toEqual(
        JSON.stringify({
          statusCode: 404,
          message: 'Voie is archived',
        }),
      );
    });

    it('Create 404 toponyme not exist', async () => {
      const balId = await createBal();
      const voieId = await createVoie({
        nom: 'rue de la paix',
        _bal: balId,
      });
      const createdNumero: CreateNumeroDto = {
        numero: 1,
        toponyme: new Types.ObjectId(),
        positions: [
          {
            type: PositionTypeEnum.ENTREE,
            source: 'ban',
            point: {
              type: 'Point',
              coordinates: [8, 42],
            },
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post(`/voies/${voieId}/numeros`)
        .send(createdNumero)
        .set('token', token)
        .expect(404);

      expect(response.text).toEqual(
        JSON.stringify({
          statusCode: 404,
          message: 'Toponyme not found',
        }),
      );
    });

    it('Create 404 bad payload', async () => {
      const balId = await createBal();
      const voieId = await createVoie({
        nom: 'rue de la paix',
        _bal: balId,
      });
      const createdNumero: CreateNumeroDto = {
        numero: 1,
      };

      const response = await request(app.getHttpServer())
        .post(`/voies/${voieId}/numeros`)
        .send(createdNumero)
        .set('token', token)
        .expect(400);

      expect(response.text).toEqual(
        JSON.stringify({
          message: ['positions should not be empty'],
          error: 'Bad Request',
          statusCode: 400,
        }),
      );
    });

    it('Create 404 bad payload', async () => {
      const balId = await createBal();
      const voieId = await createVoie({
        nom: 'rue de la paix',
        _bal: balId,
      });
      const createdNumero: CreateNumeroDto = {
        positions: [
          {
            type: PositionTypeEnum.ENTREE,
            source: 'ban',
            point: {
              type: 'Point',
              coordinates: [8, 42],
            },
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post(`/voies/${voieId}/numeros`)
        .send(createdNumero)
        .set('token', token)
        .expect(400);

      expect(response.text).toEqual(
        JSON.stringify({
          message: ["Le champ numero : undefined n'est pas valide"],
          error: 'Bad Request',
          statusCode: 400,
        }),
      );
    });
  });
});
