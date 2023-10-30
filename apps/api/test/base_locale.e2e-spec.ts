import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Connection, connect, Model, Types } from 'mongoose';

import { Numero } from '@/modules/numeros/schema/numero.schema';
import { Voie } from '@/modules/voie/schema/voie.schema';
import { Toponyme } from '@/shared/schemas/toponyme/toponyme.schema';
import { BaseLocale } from '@/modules/base_locale/schema/base_locale.schema';
import { BaseLocaleModule } from '@/modules/base_locale/base_locale.module';

import { PositionTypeEnum } from '@/shared/schemas/position_type.enum';
import { Position } from '@/shared/schemas/position.schema';
import { UpdateBatchNumeroDto } from '@/modules/numeros/dto/update_batch_numero.dto';
import { DeleteBatchNumeroDto } from '@/modules/numeros/dto/delete_batch_numero.dto';

describe('VOIE MODULE', () => {
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

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(uri),
        BaseLocaleModule
      ],
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

  async function createNumero(props: Partial<Numero> = {}) {
    const numeroId = new Types.ObjectId();
    const numero: Partial<Numero> = {
      _id: numeroId,
      ...props,
    };
    await numeroModel.create(numero);
    return numeroId;
  }

  function createPositions(coordinates: number[] = [8, 42]): Position[] {
    return [
      {
        type: PositionTypeEnum.ICONNUE,
        source: 'ban',
        point: {
          type: 'Point',
          coordinates,
        },
      },
    ];
  }

  describe('PUT /bases_locales/numeros/batch', () => {
    it('Batch 200 numeros change voie', async () => {
      const balId = await createBal();
      const voieId1 = await createVoie({ nom: 'rue de la paix', _bal: balId });
      const toponymeId1 = await createToponyme({
        nom: 'allée',
        _bal: balId,
      });
      const toponymeId2 = await createToponyme({
        nom: 'allée',
        _bal: balId,
      });
      const voieId2 = await createVoie({ nom: 'rue de la paix', _bal: balId });
      const voieId3 = await createVoie({ nom: 'rue de la paix', _bal: balId });
      const numeroId1 = await createNumero({
        _bal: balId,
        voie: voieId1,
        numero: 99,
        positions: createPositions(),
        toponyme: toponymeId1,
      });
      const numeroId2 = await createNumero({
        _bal: balId,
        voie: voieId2,
        numero: 99,
        positions: createPositions(),
        toponyme: toponymeId2,
      });

      const updateBtach: UpdateBatchNumeroDto = {
        numerosIds: [numeroId1, numeroId2],
        changes: {
          voie: voieId3,
          toponyme: toponymeId2,
          positionType: PositionTypeEnum.DELIVRANCE_POSTALE,
          certifie: true,
          comment: 'coucou',
        },
      };

      const response = await request(app.getHttpServer())
        .put(`/bases_locales/${balId}/numeros/batch`)
        .send(updateBtach)
        .set('token', token)
        .expect(200);

      expect(response.body.modifiedCount).toEqual(2);
      expect(response.body.changes).toEqual({
        voie: voieId3.toString(),
        toponyme: toponymeId2.toString(),
        positionType: PositionTypeEnum.DELIVRANCE_POSTALE,
        certifie: true,
        comment: 'coucou',
      });

      const numero1After: Numero = await numeroModel.findOne({
        _id: numeroId1,
      });
      expect(numero1After._updated).toBeDefined();
      expect(numero1After.voie).toEqual(voieId3);
      expect(numero1After.positions[0].type).toEqual(
        PositionTypeEnum.DELIVRANCE_POSTALE,
      );
      expect(numero1After.certifie).toBeTruthy();
      expect(numero1After.comment).toEqual('coucou');

      const numero2After: Numero = await numeroModel.findOne({
        _id: numeroId2,
      });
      expect(numero2After._updated).toBeDefined();
      expect(numero2After.voie).toEqual(voieId3);
      expect(numero2After.positions[0].type).toEqual(
        PositionTypeEnum.DELIVRANCE_POSTALE,
      );
      expect(numero2After.certifie).toBeTruthy();
      expect(numero2After.comment).toEqual('coucou');

      const voie1After: Voie = await voieModel.findOne({ _id: voieId1 });
      expect(voie1After._updated).toBeDefined();
      expect(voie1After.centroid).toBeNull();
      expect(voie1After.centroidTiles).toBeNull();

      const voie2After: Voie = await voieModel.findOne({ _id: voieId2 });
      expect(voie2After._updated).toBeDefined();
      expect(voie2After.centroid).toBeNull();
      expect(voie2After.centroidTiles).toBeNull();

      const voie3After: Voie = await voieModel.findOne({ _id: voieId3 });
      expect(voie3After._updated).toBeDefined();
      expect(voie3After.centroid).not.toBeNull();
      expect(voie3After.centroidTiles).not.toBeNull();

      const toponymeAfter1: Toponyme = await toponymeModel.findOne({
        _id: toponymeId1,
      });
      expect(toponymeAfter1._updated).toBeDefined();

      const toponymeAfter2: Toponyme = await toponymeModel.findOne({
        _id: toponymeId2,
      });
      expect(toponymeAfter2._updated).toBeDefined();

      const balAfter: BaseLocale = await balModel.findOne({ _id: balId });
      expect(balAfter._updated).toBeDefined();
    });

    it('Batch 400 without numeroIds', async () => {
      const balId = await createBal();

      const updateBtach: UpdateBatchNumeroDto = {
        numerosIds: [],
        changes: {
          positionType: PositionTypeEnum.DELIVRANCE_POSTALE,
          certifie: true,
          comment: 'coucou',
        },
      };

      await request(app.getHttpServer())
        .put(`/bases_locales/${balId}/numeros/batch`)
        .send(updateBtach)
        .set('token', token)
        .expect(400);
    });

    it('Batch 400 without changes', async () => {
      const balId = await createBal();
      const voieId = await createVoie({ nom: 'rue de la paix', _bal: balId });
      const numeroId = await createNumero({
        _bal: balId,
        voie: voieId,
        numero: 99,
        positions: createPositions(),
      });
      const updateBtach: UpdateBatchNumeroDto = {
        numerosIds: [numeroId],
        changes: {},
      };

      await request(app.getHttpServer())
        .put(`/bases_locales/${balId}/numeros/batch`)
        .send(updateBtach)
        .set('token', token)
        .expect(400);
    });

    it('Batch 404 numeros: Bad voie', async () => {
      const balId = await createBal();
      const voieId = await createVoie({ nom: 'rue de la paix', _bal: balId });
      const numeroId = await createNumero({
        _bal: balId,
        voie: voieId,
        numero: 99,
        positions: createPositions(),
      });
      const updateBtach: UpdateBatchNumeroDto = {
        numerosIds: [numeroId],
        changes: {
          voie: new Types.ObjectId(),
        },
      };

      await request(app.getHttpServer())
        .put(`/bases_locales/${balId}/numeros/batch`)
        .send(updateBtach)
        .set('token', token)
        .expect(404);
    });

    it('Batch 404 numeros: Bad toponyme', async () => {
      const balId = await createBal();
      const voieId = await createVoie({ nom: 'rue de la paix', _bal: balId });
      const numeroId = await createNumero({
        _bal: balId,
        voie: voieId,
        numero: 99,
        positions: createPositions(),
      });
      const updateBtach: UpdateBatchNumeroDto = {
        numerosIds: [numeroId],
        changes: {
          toponyme: new Types.ObjectId(),
        },
      };

      await request(app.getHttpServer())
        .put(`/bases_locales/${balId}/numeros/batch`)
        .send(updateBtach)
        .set('token', token)
        .expect(404);
    });
  });

  describe('PUT /bases_locales/numeros/batch/soft-delete', () => {
    it('Soft Delete 200', async () => {
      const balId = await createBal();
      const voieId1 = await createVoie({ nom: 'rue de la paix', _bal: balId });
      const toponymeId1 = await createToponyme({
        nom: 'allée',
        _bal: balId,
      });
      const toponymeId2 = await createToponyme({
        nom: 'allée',
        _bal: balId,
      });
      const voieId2 = await createVoie({ nom: 'rue de la paix', _bal: balId });
      const numeroId1 = await createNumero({
        _bal: balId,
        voie: voieId1,
        numero: 99,
        positions: createPositions(),
        toponyme: toponymeId1,
      });
      const numeroId2 = await createNumero({
        _bal: balId,
        voie: voieId2,
        numero: 99,
        positions: createPositions(),
        toponyme: toponymeId2,
      });

      const deleteBtach: DeleteBatchNumeroDto = {
        numerosIds: [numeroId1, numeroId2],
      };

      const response = await request(app.getHttpServer())
        .put(`/bases_locales/${balId}/numeros/batch/soft-delete`)
        .send(deleteBtach)
        .set('token', token)
        .expect(200);

      expect(response.body.modifiedCount).toEqual(2);
      const numero1After: Numero = await numeroModel.findOne({
        _id: numeroId1,
      });
      expect(numero1After._updated).toBeDefined();
      expect(numero1After._deleted).toBeDefined();

      const numero2After: Numero = await numeroModel.findOne({
        _id: numeroId2,
      });
      expect(numero2After._updated).toBeDefined();
      expect(numero2After._deleted).toBeDefined();

      const voie1After: Voie = await voieModel.findOne({ _id: voieId1 });
      expect(voie1After._updated).toBeDefined();
      expect(voie1After.centroid).toBeNull();
      expect(voie1After.centroidTiles).toBeNull();

      const voie2After: Voie = await voieModel.findOne({ _id: voieId2 });
      expect(voie2After._updated).toBeDefined();
      expect(voie2After.centroid).toBeNull();
      expect(voie2After.centroidTiles).toBeNull();

      const toponymeAfter1: Toponyme = await toponymeModel.findOne({
        _id: toponymeId1,
      });
      expect(toponymeAfter1._updated).toBeDefined();

      const toponymeAfter2: Toponyme = await toponymeModel.findOne({
        _id: toponymeId2,
      });
      expect(toponymeAfter2._updated).toBeDefined();

      const balAfter: BaseLocale = await balModel.findOne({ _id: balId });
      expect(balAfter._updated).toBeDefined();
    });

    it('Soft Delete 400: Bad request', async () => {
      const balId = await createBal();
      const deleteBtach: DeleteBatchNumeroDto = {
        numerosIds: [],
      };

      await request(app.getHttpServer())
        .put(`/bases_locales/${balId}/numeros/batch/soft-delete`)
        .send(deleteBtach)
        .set('token', token)
        .expect(400);
    });
  });

  describe('DELETE /bases_locales/numeros/batch', () => {
    it('Delete 204', async () => {
      const balId = await createBal();
      const voieId1 = await createVoie({ nom: 'rue de la paix', _bal: balId });
      const toponymeId1 = await createToponyme({
        nom: 'allée',
        _bal: balId,
      });
      const toponymeId2 = await createToponyme({
        nom: 'allée',
        _bal: balId,
      });
      const voieId2 = await createVoie({ nom: 'rue de la paix', _bal: balId });
      const numeroId1 = await createNumero({
        _bal: balId,
        voie: voieId1,
        numero: 99,
        positions: createPositions(),
        toponyme: toponymeId1,
      });
      const numeroId2 = await createNumero({
        _bal: balId,
        voie: voieId2,
        numero: 99,
        positions: createPositions(),
        toponyme: toponymeId2,
      });

      const deleteBtach: DeleteBatchNumeroDto = {
        numerosIds: [numeroId1, numeroId2],
      };

      await request(app.getHttpServer())
        .delete(`/bases_locales/${balId}/numeros/batch/`)
        .send(deleteBtach)
        .set('token', token)
        .expect(204);

      const numero1After: Numero = await numeroModel.findOne({
        _id: numeroId1,
      });
      expect(numero1After).toBeNull();

      const numero2After: Numero = await numeroModel.findOne({
        _id: numeroId2,
      });
      expect(numero2After).toBeNull();

      const voie1After: Voie = await voieModel.findOne({ _id: voieId1 });
      expect(voie1After._updated).toBeDefined();
      expect(voie1After.centroid).toBeNull();
      expect(voie1After.centroidTiles).toBeNull();

      const voie2After: Voie = await voieModel.findOne({ _id: voieId2 });
      expect(voie2After._updated).toBeDefined();
      expect(voie2After.centroid).toBeNull();
      expect(voie2After.centroidTiles).toBeNull();

      const toponymeAfter1: Toponyme = await toponymeModel.findOne({
        _id: toponymeId1,
      });
      expect(toponymeAfter1._updated).toBeDefined();

      const toponymeAfter2: Toponyme = await toponymeModel.findOne({
        _id: toponymeId2,
      });
      expect(toponymeAfter2._updated).toBeDefined();

      const balAfter: BaseLocale = await balModel.findOne({ _id: balId });
      expect(balAfter._updated).toBeDefined();
    });

    it('Delete 400: Bad request', async () => {
      const balId = await createBal();
      const deleteBtach: DeleteBatchNumeroDto = {
        numerosIds: [],
      };

      await request(app.getHttpServer())
        .delete(`/bases_locales/${balId}/numeros/batch`)
        .send(deleteBtach)
        .set('token', token)
        .expect(400);
    });
  });
});
