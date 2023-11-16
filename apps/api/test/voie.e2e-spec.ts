import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Connection, connect, Model, Types } from 'mongoose';

import { Numero } from '@/shared/schemas/numero/numero.schema';
import { Voie } from '@/shared/schemas/voie/voie.schema';
import { Toponyme } from '@/shared/schemas/toponyme/toponyme.schema';
import { BaseLocale } from '@/shared/schemas/base_locale/base_locale.schema';
import { PositionTypeEnum } from '@/shared/schemas/position_type.enum';

import { VoieModule } from '@/modules/voie/voie.module';
import { CreateNumeroDto } from '@/modules/numeros/dto/create_numero.dto';
import { UpdateVoieDto } from '@/modules/voie/dto/update_voie.dto';
import { TypeNumerotationEnum } from '@/shared/schemas/voie/type_numerotation.enum';

describe('VOIE MODULE', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;
  let numeroModel: Model<Numero>;
  let voieModel: Model<Voie>;
  let balModel: Model<BaseLocale>;
  let toponymeModel: Model<Toponyme>;
  // VAR
  const token = 'xxxx';
  const _created = new Date('2000-01-01');
  const _updated = new Date('2000-01-02');

  beforeAll(async () => {
    // INIT DB
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    mongoConnection = (await connect(uri)).connection;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [MongooseModule.forRoot(uri), VoieModule],
    }).compile();

    app = moduleFixture.createNestApplication();
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
    await app.close();
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
      _created,
      _updated,
      token,
    };
    await balModel.create(bal);
    return balId;
  }

  async function createVoie(props: Partial<Voie> = {}) {
    const voieId = new Types.ObjectId();
    const voie: Partial<Voie> = {
      _id: voieId,
      _created,
      _updated,
      ...props,
    };
    await voieModel.create(voie);
    return voieId;
  }

  async function createNumero(props: Partial<Numero> = {}) {
    const numeroId = new Types.ObjectId();
    const numero: Partial<Numero> = {
      _id: numeroId,
      _created,
      _updated,
      ...props,
    };
    await numeroModel.create(numero);
    return numeroId;
  }

  describe('GET /voies/numeros', () => {
    it('Return 200 numero without comment', async () => {
      const balId = await createBal();
      const voieId = await createVoie({ nom: 'rue de la paix', _bal: balId });
      const numeroId1 = await createNumero({
        _bal: balId,
        voie: voieId,
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

    it('Return 200 numeronot deleted', async () => {
      const balId = await createBal();
      const voieId = await createVoie({ nom: 'rue de la paix', _bal: balId });
      await createNumero({
        _bal: balId,
        voie: voieId,
        numero: 1,
        comment: 'coucou',
      });

      await createNumero({
        _bal: balId,
        voie: voieId,
        numero: 2,
        comment: 'coucou',
        _deleted: new Date(),
      });

      const response = await request(app.getHttpServer())
        .get(`/voies/${voieId}/numeros`)
        .expect(200);
      expect(response.body).toHaveLength(1);
    });

    it('Return 200 numero with comment', async () => {
      const balId = await createBal();
      const voieId = await createVoie({ nom: 'rue de la paix', _bal: balId });
      const numeroId1 = await createNumero({
        _bal: balId,
        voie: voieId,
        numero: 1,
        comment: 'coucou',
      });

      const response = await request(app.getHttpServer())
        .get(`/voies/${voieId}/numeros`)
        .set('authorization', `Bearer ${token}`)
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
        .set('authorization', `Bearer ${token}`)
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
      expect(response.body._updated).not.toEqual(_updated.toISOString());
      expect(response.body._created).not.toEqual(_created.toISOString());
      expect(response.body._deleted).toEqual(null);

      const voieAfter: Voie = await voieModel.findOne({ _id: voieId });
      const balAfter: BaseLocale = await balModel.findOne({ _id: balId });
      expect(voieAfter._updated).not.toEqual(_updated.toISOString());
      expect(balAfter._updated).not.toEqual(_updated.toISOString());
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
        .set('authorization', `Bearer ${token}`)
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
      expect(response.body._updated).not.toEqual(_updated.toISOString());
      expect(response.body._created).not.toEqual(_created.toISOString());
      expect(response.body._deleted).toEqual(null);

      const voieAfter: Voie = await voieModel.findOne({ _id: voieId });
      const balAfter: BaseLocale = await balModel.findOne({ _id: balId });
      expect(voieAfter._updated).not.toEqual(_updated.toISOString());
      expect(balAfter._updated).not.toEqual(_updated.toISOString());
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
        .set('authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.text).toEqual(
        JSON.stringify({
          statusCode: 404,
          message: 'Voie is archived',
        }),
      );

      const voieAfter: Voie = await voieModel.findOne({ _id: voieId });
      const balAfter: BaseLocale = await balModel.findOne({ _id: balId });
      expect(voieAfter._updated.toISOString()).toEqual(_updated.toISOString());
      expect(balAfter._updated.toISOString()).toEqual(_updated.toISOString());
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
        .set('authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.text).toEqual(
        JSON.stringify({
          statusCode: 404,
          message: 'Toponyme not found',
        }),
      );

      const voieAfter: Voie = await voieModel.findOne({ _id: voieId });
      const balAfter: BaseLocale = await balModel.findOne({ _id: balId });
      expect(voieAfter._updated.toISOString()).toEqual(_updated.toISOString());
      expect(balAfter._updated.toISOString()).toEqual(_updated.toISOString());
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
        .set('authorization', `Bearer ${token}`)
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
        .set('authorization', `Bearer ${token}`)
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

  describe('PUT /voies/:voieId/convert-to-toponyme', () => {
    it('Return 200 numero without comment', async () => {
      const balId = await createBal();
      const voieId = await createVoie({ nom: 'rue de la paix', _bal: balId });
      await request(app.getHttpServer())
        .put(`/voies/${voieId}/convert-to-toponyme`)
        .set('authorization', `Bearer ${token}`)
        .expect(200);

      const toponyme: Toponyme = await toponymeModel.findOne({
        nom: 'rue de la paix',
      });
      expect(toponyme).toBeDefined();
    });

    it('Return 200 numero without comment', async () => {
      const balId = await createBal();
      const voieId = await createVoie({ nom: 'rue de paris', _bal: balId });
      await createNumero({
        _bal: balId,
        voie: voieId,
      });

      const response = await request(app.getHttpServer())
        .put(`/voies/${voieId}/convert-to-toponyme`)
        .set('authorization', `Bearer ${token}`)
        .expect(400);

      expect(response.text).toEqual(
        JSON.stringify({
          statusCode: 400,
          message: `Voie ${voieId} has numero(s)`,
        }),
      );

      const toponyme: Toponyme = await toponymeModel.findOne({
        nom: 'rue de paris',
      });
      expect(toponyme).toBeNull();
    });
  });

  describe('GET /voies', () => {
    it('Return 200', async () => {
      const balId = await createBal();
      const voieId = await createVoie({ nom: 'rue de la paix', _bal: balId });
      const response = await request(app.getHttpServer())
        .get(`/voies/${voieId}`)
        .expect(200);
      expect(response.body._id).toEqual(voieId.toString());
      expect(response.body._bal).toEqual(balId.toString());
      expect(response.body.nom).toEqual('rue de la paix');
    });

    it('Return 404', async () => {
      await request(app.getHttpServer())
        .get(`/voies/${new Types.ObjectId()}`)
        .expect(404);
    });
  });

  describe('PUT /voies', () => {
    it('Return 200', async () => {
      const balId = await createBal();
      const voieId = await createVoie({ nom: 'rue de la paix', _bal: balId });
      const changes: UpdateVoieDto = {
        nom: 'coucou',
        nomAlt: null,
        typeNumerotation: TypeNumerotationEnum.NUMERIQUE,
        trace: {
          type: 'LineString',
          coordinates: [
            [48, 2],
            [49, 1],
          ],
        },
      };

      const response = await request(app.getHttpServer())
        .put(`/voies/${voieId}`)
        .send(changes)
        .set('authorization', `Bearer ${token}`)
        .expect(200);
      expect(response.body._id).toEqual(voieId.toString());
      expect(response.body._bal).toEqual(balId.toString());
      expect(response.body.nom).toEqual('coucou');
      expect(response.body.typeNumerotation).toEqual(
        TypeNumerotationEnum.NUMERIQUE,
      );
      expect(response.body.trace).toEqual(changes.trace);

      const bal = await balModel.findOne(balId);
      expect(bal._updated.toISOString()).not.toEqual(_updated.toISOString());
    });

    it('Return 200 trace empty', async () => {
      const balId = await createBal();
      const voieId = await createVoie({ nom: 'rue de la paix', _bal: balId });
      const changes: UpdateVoieDto = {
        nom: 'coucou',
        nomAlt: null,
        typeNumerotation: TypeNumerotationEnum.NUMERIQUE,
        trace: null,
      };

      const response = await request(app.getHttpServer())
        .put(`/voies/${voieId}`)
        .send(changes)
        .set('authorization', `Bearer ${token}`)
        .expect(200);
      expect(response.body._id).toEqual(voieId.toString());
      expect(response.body._bal).toEqual(balId.toString());
      expect(response.body.nom).toEqual('coucou');
      expect(response.body.typeNumerotation).toEqual(
        TypeNumerotationEnum.NUMERIQUE,
      );
      expect(response.body.trace).toEqual(null);

      const bal = await balModel.findOne(balId);
      expect(bal._updated.toISOString()).not.toEqual(_updated.toISOString());
    });

    it('Return 403', async () => {
      const balId = await createBal();
      const voieId = await createVoie({
        nom: 'rue de la paix',
        _bal: balId,
        trace: null,
      });
      const changes: UpdateVoieDto = {
        nom: 'coucou',
        nomAlt: null,
        typeNumerotation: TypeNumerotationEnum.NUMERIQUE,
        trace: {
          type: 'LineString',
          coordinates: [
            [48, 2],
            [49, 1],
          ],
        },
      };

      await request(app.getHttpServer())
        .put(`/voies/${voieId}`)
        .send(changes)
        .expect(403);

      const voie = await voieModel.findOne(voieId);
      expect(voie.nom).toEqual('rue de la paix');
      expect(voie.trace).toBeNull();

      const bal = await balModel.findOne(balId);
      expect(bal._updated.toISOString()).toEqual(_updated.toISOString());
    });
  });

  describe('PUT /soft-delete', () => {
    it('Return 200', async () => {
      const balId = await createBal();
      const voieId = await createVoie({
        nom: 'rue de la paix',
        _bal: balId,
        _deleted: null,
      });
      const response = await request(app.getHttpServer())
        .put(`/voies/${voieId}/soft-delete`)
        .set('authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body._deleted).not.toBeNull();

      const bal = await balModel.findOne(balId);
      expect(bal._updated.toISOString()).not.toEqual(_updated.toISOString());
    });

    it('Return 403', async () => {
      const balId = await createBal();
      const voieId = await createVoie({
        nom: 'rue de la paix',
        _bal: balId,
        _deleted: null,
      });
      await request(app.getHttpServer())
        .put(`/voies/${voieId}/soft-delete`)
        .expect(403);

      const voie = await voieModel.findOne(voieId);
      expect(voie._deleted).toBeNull();

      const bal = await balModel.findOne(balId);
      expect(bal._updated.toISOString()).toEqual(_updated.toISOString());
    });
  });

  describe('PUT /restore', () => {
    it('Return 200', async () => {
      const balId = await createBal();
      const voieId = await createVoie({
        nom: 'rue de la paix',
        _bal: balId,
        _deleted: _updated,
      });
      const numeroId = await createNumero({
        _bal: balId,
        voie: voieId,
        _deleted: _updated,
      });
      const response = await request(app.getHttpServer())
        .put(`/voies/${voieId}/restore`)
        .send({ numerosIds: [numeroId] })
        .set('authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body._deleted).toBeNull();

      const numero = await numeroModel.findOne(numeroId);

      expect(numero._deleted).toEqual(null);

      const bal = await balModel.findOne(balId);
      expect(bal._updated.toISOString()).not.toEqual(_updated.toISOString());
    });

    it('Return 403', async () => {
      const balId = await createBal();
      const voieId = await createVoie({
        nom: 'rue de la paix',
        _bal: balId,
        _deleted: _updated,
      });
      const numeroId = await createNumero({
        _bal: balId,
        voie: voieId,
        _deleted: _updated,
      });
      await request(app.getHttpServer())
        .put(`/voies/${voieId}/restore`)
        .send({ numeroIds: [numeroId] })
        .expect(403);

      const voie = await voieModel.findOne(voieId);
      expect(voie._deleted).not.toBeNull();

      const numero = await numeroModel.findOne(numeroId);

      expect(numero._deleted).not.toBeNull();

      const bal = await balModel.findOne(balId);
      expect(bal._updated.toISOString()).toEqual(_updated.toISOString());
    });
  });

  describe('DELETE /voies', () => {
    it('Return 200', async () => {
      const balId = await createBal();
      const voieId = await createVoie({
        nom: 'rue de la paix',
        _bal: balId,
        _deleted: _updated,
      });
      const numeroId = await createNumero({
        _bal: balId,
        voie: voieId,
        _deleted: _updated,
      });
      await request(app.getHttpServer())
        .delete(`/voies/${voieId}`)
        .set('authorization', `Bearer ${token}`)
        .expect(204);

      const voie = await voieModel.findOne(voieId);
      expect(voie).toBeNull();

      const numero = await numeroModel.findOne(numeroId);
      expect(numero).toBeNull();

      const bal = await balModel.findOne(balId);
      expect(bal._updated.toISOString()).not.toEqual(_updated.toISOString());
    });

    it('Return 403', async () => {
      const balId = await createBal();
      const voieId = await createVoie({
        nom: 'rue de la paix',
        _bal: balId,
        _deleted: _updated,
      });
      const numeroId = await createNumero({
        _bal: balId,
        voie: voieId,
        _deleted: _updated,
      });

      await request(app.getHttpServer())
        .put(`/voies/${voieId}/restore`)
        .send({ numeroIds: [numeroId] })
        .expect(403);

      const voie = await voieModel.findOne(voieId);
      expect(voie).not.toBeNull();

      const numero = await numeroModel.findOne(numeroId);
      expect(numero).not.toBeNull();

      const bal = await balModel.findOne(balId);
      expect(bal._updated.toISOString()).toEqual(_updated.toISOString());
    });
  });
});
