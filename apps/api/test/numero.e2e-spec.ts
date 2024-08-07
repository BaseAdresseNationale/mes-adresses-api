import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Connection, connect, Model, Types } from 'mongoose';

import { Numero } from '@/shared/schemas/numero/numero.schema';
import { Voie } from '@/shared/schemas/voie/voie.schema';
import { BaseLocale } from '@/shared/schemas/base_locale/base_locale.schema';
import { PositionTypeEnum } from '@/shared/schemas/position_type.enum';

import { NumeroModule } from '@/modules/numeros/numero.module';
import { UpdateNumeroDTO } from '@/modules/numeros/dto/update_numero.dto';
import { MailerModule } from '@/shared/test/mailer.module.test';

describe('NUMERO', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;
  let numeroModel: Model<Numero>;
  let voieModel: Model<Voie>;
  let balModel: Model<BaseLocale>;
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
      imports: [MongooseModule.forRoot(uri), NumeroModule, MailerModule],
    }).compile();

    app = moduleFixture.createNestApplication();
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
    await app.close();
  });

  afterEach(async () => {
    await voieModel.deleteMany({});
    await balModel.deleteMany({});
    await numeroModel.deleteMany({});
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

  describe('GET /numero', () => {
    it('Return 200 numero', async () => {
      const balId = await createBal();
      const voieId = await createVoie({ nom: 'rue de la paix' });
      const numeroId = await createNumero({
        _bal: balId,
        voie: voieId,
        numero: 99,
      });

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
      const numeroId = await createNumero({
        _bal: balId,
        voie: voieId,
        numero: 99,
        comment: 'coucou',
      });

      const response = await request(app.getHttpServer())
        .get(`/numeros/${numeroId}`)
        .expect(200);
      expect(response.body.comment).toEqual(null);
    });

    it('Return 200 numero with comment', async () => {
      const balId = await createBal();
      const voieId = await createVoie({ nom: 'rue de la paix' });
      const numeroId = await createNumero({
        _bal: balId,
        voie: voieId,
        numero: 99,
        comment: 'coucou',
      });

      const response = await request(app.getHttpServer())
        .get(`/numeros/${numeroId}`)
        .set('authorization', `Bearer ${token}`)
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
      const numeroId = await createNumero({
        _bal: balId,
        voie: voieId,
        numero: 99,
      });

      const updatedNumero: UpdateNumeroDTO = {
        numero: 100,
      };

      const response = await request(app.getHttpServer())
        .put(`/numeros/${numeroId}`)
        .send(updatedNumero)
        .set('authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body._id).toEqual(numeroId.toString());
      expect(response.body._bal).toEqual(balId.toString());
      expect(response.body.numero).toEqual(100);
      expect(response.body.voie).toEqual(voieId.toString());
      expect(response.body.parcelles).toEqual([]);
      expect(response.body.positions).toEqual([]);
      expect(response.body.voie).toEqual(voieId.toString());

      const voieDbAfter = await voieModel.findOne({ _id: voieId });
      const balDbAfter = await balModel.findOne({ _id: balId });
      expect(voieDbAfter._updated).not.toEqual(_updated.toISOString());
      expect(balDbAfter._updated).not.toEqual(_updated.toISOString());
    });

    it('Update 404 Numero Not Found', async () => {
      const updatedNumero: UpdateNumeroDTO = {
        numero: 100,
      };

      const numeroId = new Types.ObjectId();
      await request(app.getHttpServer())
        .put(`/numeros/${numeroId}`)
        .send(updatedNumero)
        .set('authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('Update 404 Voie Not Found', async () => {
      const balId = await createBal();
      const voieId = await createVoie({ nom: 'rue de la paix' });
      const numeroId = await createNumero({
        _bal: balId,
        voie: voieId,
        numero: 99,
      });

      const updatedNumero: UpdateNumeroDTO = {
        voie: new Types.ObjectId(),
      };

      await request(app.getHttpServer())
        .put(`/numeros/${numeroId}`)
        .send(updatedNumero)
        .set('authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('Update 404 Toponyme Not Found', async () => {
      const balId = await createBal();
      const voieId = await createVoie({ nom: 'rue de la paix' });
      const numeroId = await createNumero({
        _bal: balId,
        voie: voieId,
        numero: 99,
      });

      const updatedNumero: UpdateNumeroDTO = {
        toponyme: new Types.ObjectId(),
      };

      await request(app.getHttpServer())
        .put(`/numeros/${numeroId}`)
        .send(updatedNumero)
        .set('authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('Update 403 Forbiden', async () => {
      const balId = await createBal();
      const voieId = await createVoie({ nom: 'rue de la paix' });
      const numeroId = await createNumero({
        _bal: balId,
        voie: voieId,
        numero: 99,
      });

      const updatedNumero: UpdateNumeroDTO = {
        numero: 100,
      };

      await request(app.getHttpServer())
        .put(`/numeros/${numeroId}`)
        .send(updatedNumero)
        .expect(403);

      const voieDbAfter = await voieModel.findOne({ _id: voieId });
      const balDbAfter = await balModel.findOne({ _id: balId });
      expect(voieDbAfter._updated.toISOString()).toEqual(
        _updated.toISOString(),
      );
      expect(balDbAfter._updated.toISOString()).toEqual(_updated.toISOString());
    });

    it('Update 200 check field _updated of voie and bal', async () => {
      const balId = await createBal();
      const voieId = await createVoie({ nom: 'rue de la paix' });
      const numeroId = await createNumero({
        _bal: balId,
        voie: voieId,
        numero: 99,
      });

      const voieDbBefore = await voieModel.findOne({ _id: voieId });
      const balDbBefore = await balModel.findOne({ _id: balId });

      const updatedNumero: UpdateNumeroDTO = {
        numero: 100,
      };

      await request(app.getHttpServer())
        .put(`/numeros/${numeroId}`)
        .send(updatedNumero)
        .set('authorization', `Bearer ${token}`)
        .expect(200);

      const voieDbAfter = await voieModel.findOne({ _id: voieId });
      const balDbAfter = await balModel.findOne({ _id: balId });
      expect(voieDbBefore._updated).not.toEqual(voieDbAfter._updated);
      expect(balDbBefore._updated).not.toEqual(balDbAfter._updated);
    });

    it('Update 200 check field _updated is UPDATE', async () => {
      const balId = await createBal();
      const voieId = await createVoie({ nom: 'rue de la paix' });
      const numeroId = await createNumero({
        _bal: balId,
        voie: voieId,
        numero: 99,
      });

      const updatedNumero: UpdateNumeroDTO = {
        numero: 100,
      };

      await request(app.getHttpServer())
        .put(`/numeros/${numeroId}`)
        .send(updatedNumero)
        .set('authorization', `Bearer ${token}`)
        .expect(200);

      const numeroDbAfter = await numeroModel.findOne({ _id: numeroId });
      const voieDbAfter = await voieModel.findOne({ _id: voieId });
      const balDbAfter = await balModel.findOne({ _id: balId });

      expect(numeroDbAfter._updated).not.toEqual(_updated.toISOString());
      expect(voieDbAfter._updated).not.toEqual(_updated.toISOString());
      expect(balDbAfter._updated).not.toEqual(_updated.toISOString());
    });

    it('Update 200 check field tiles Numero is UPDATE and centroid, centroidTiles voie is UPDATE', async () => {
      const balId = await createBal();
      const voieId = await createVoie({ nom: 'rue de la paix' });
      const numeroId = await createNumero({
        _bal: balId,
        voie: voieId,
        numero: 99,
      });

      const numeroDbBefore = await numeroModel.findOne({ _id: numeroId });
      const voieDbBefore = await voieModel.findOne({ _id: voieId });

      const updatedNumero: UpdateNumeroDTO = {
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

      await request(app.getHttpServer())
        .put(`/numeros/${numeroId}`)
        .send(updatedNumero)
        .set('authorization', `Bearer ${token}`)
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
      const numeroId = await createNumero({
        _bal: balId,
        voie: voieId1,
        numero: 99,
        positions: [
          {
            type: PositionTypeEnum.INCONNUE,
            source: 'ban',
            point: {
              type: 'Point',
              coordinates: [8, 42],
            },
          },
        ],
      });

      const voie1DbBefore: Voie = await voieModel.findOne({ _id: voieId1 });

      const updatedNumero: UpdateNumeroDTO = {
        voie: voieId2,
      };

      await request(app.getHttpServer())
        .put(`/numeros/${numeroId}`)
        .send(updatedNumero)
        .set('authorization', `Bearer ${token}`)
        .expect(200);

      const voie1DbAfter: Voie = await voieModel.findOne({ _id: voieId1 });
      const voie2DbAfter: Voie = await voieModel.findOne({ _id: voieId2 });

      expect(voie1DbBefore.centroid).not.toBe(null);
      expect(voie1DbBefore.centroidTiles).not.toBe(null);
      expect(voie1DbAfter.centroid).toBe(null);
      expect(voie1DbAfter.centroidTiles).toBe(null);
      expect(voie2DbAfter.centroid).not.toBe(null);
      expect(voie2DbAfter.centroidTiles).not.toBe(null);

      expect(voie1DbAfter._updated).not.toEqual(_updated.toISOString());
      expect(voie2DbAfter._updated).not.toEqual(_updated.toISOString());
    });
  });

  describe('DELETE /numero', () => {
    it('Delete 204 numero', async () => {
      const balId = await createBal();
      const voieId = await createVoie({ nom: 'rue de la paix' });
      const numeroId = await createNumero({
        _bal: balId,
        voie: voieId,
        numero: 99,
      });

      await request(app.getHttpServer())
        .delete(`/numeros/${numeroId}`)
        .set('authorization', `Bearer ${token}`)
        .expect(204);

      const numeroDeleted: Numero = await numeroModel.findOne({
        _id: numeroId,
      });

      expect(numeroDeleted).toBe(null);
      const voieAfter: Voie = await voieModel.findOne({ _id: voieId });
      const balAfter: BaseLocale = await balModel.findOne({ _id: balId });
      expect(voieAfter._updated).not.toEqual(_updated.toISOString());
      expect(balAfter._updated).not.toEqual(_updated.toISOString());
    });

    it('Delete 404 NOT FOUND', async () => {
      const numeroId = new Types.ObjectId();
      await request(app.getHttpServer())
        .delete(`/numeros/${numeroId}`)
        .set('authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('Delete 403 FORBIDEN', async () => {
      const balId = await createBal();
      const voieId = await createVoie({ nom: 'rue de la paix' });
      const numeroId = await createNumero({
        _bal: balId,
        voie: voieId,
        numero: 99,
      });

      await request(app.getHttpServer())
        .delete(`/numeros/${numeroId}`)
        .expect(403);

      const numeroDeleted: Numero = await numeroModel.findOne({
        _id: numeroId,
      });

      expect(numeroDeleted).not.toBe(null);
      const voieAfter: Voie = await voieModel.findOne({ _id: voieId });
      const balAfter: BaseLocale = await balModel.findOne({ _id: balId });
      expect(voieAfter._updated.toISOString()).toEqual(_updated.toISOString());
      expect(balAfter._updated.toISOString()).toEqual(_updated.toISOString());
    });
  });

  describe('SOFT DELETE /numero', () => {
    it('Soft Delete 200 numero', async () => {
      const balId = await createBal();
      const voieId = await createVoie({ nom: 'rue de la paix' });
      const numeroId = await createNumero({
        _bal: balId,
        voie: voieId,
        numero: 99,
      });

      await request(app.getHttpServer())
        .put(`/numeros/${numeroId}/soft-delete`)
        .set('authorization', `Bearer ${token}`)
        .expect(200);

      const numeroDeleted: Numero = await numeroModel.findOne({
        _id: numeroId,
      });

      expect(numeroDeleted._deleted).not.toBe(null);

      const voieAfter: Voie = await voieModel.findOne({ _id: voieId });
      const balAfter: BaseLocale = await balModel.findOne({ _id: balId });
      expect(voieAfter._updated).not.toEqual(_updated.toISOString());
      expect(balAfter._updated).not.toEqual(_updated.toISOString());
    });

    it('Soft Delete 404 NOT FOUND', async () => {
      const numeroId = new Types.ObjectId();
      await request(app.getHttpServer())
        .put(`/numeros/${numeroId}/soft-delete`)
        .set('authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('Soft Delete 403 FORBIDEN', async () => {
      const balId = await createBal();
      const voieId = await createVoie({ nom: 'rue de la paix' });
      const numeroId = await createNumero({
        _bal: balId,
        voie: voieId,
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
      const voieAfter: Voie = await voieModel.findOne({ _id: voieId });
      const balAfter: BaseLocale = await balModel.findOne({ _id: balId });
      expect(voieAfter._updated.toISOString()).toEqual(_updated.toISOString());
      expect(balAfter._updated.toISOString()).toEqual(_updated.toISOString());
    });
  });
});
