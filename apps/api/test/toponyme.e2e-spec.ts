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

import { ToponymeModule } from '@/modules/toponyme/toponyme.module';
import { UpdateToponymeDto } from '@/modules/toponyme/dto/update_toponyme.dto';
import { PositionTypeEnum } from '@/shared/schemas/position_type.enum';
import { Position } from '@/shared/schemas/position.schema';

describe('TOPONYME MODULE', () => {
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
      imports: [MongooseModule.forRoot(uri), ToponymeModule],
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
    await toponymeModel.deleteMany({});
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

  async function createToponyme(props: Partial<Toponyme> = {}) {
    const toponymeId = new Types.ObjectId();
    const toponyme: Partial<Toponyme> = {
      _id: toponymeId,
      _created,
      _updated,
      ...props,
    };
    await toponymeModel.create(toponyme);
    return toponymeId;
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

  function createPositions(coordinates: number[] = [8, 42]): Position[] {
    return [
      {
        type: PositionTypeEnum.BATIMENT,
        source: 'ban',
        point: {
          type: 'Point',
          coordinates,
        },
      },
    ];
  }

  describe('GET /toponymes/numeros', () => {
    it('Return 200 numero without comment', async () => {
      const balId = await createBal();
      const toponymeId = await createToponyme({ nom: 'allée', _bal: balId });
      const voieId = await createVoie({ nom: 'rue de la paix', _bal: balId });
      await createNumero({
        _bal: balId,
        voie: voieId,
        numero: 1,
        comment: 'coucou',
        toponyme: toponymeId,
      });
      await createNumero({
        _bal: balId,
        voie: voieId,
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
      await createNumero({
        _bal: balId,
        voie: voieId,
        numero: 1,
        comment: 'coucou',
        toponyme: toponymeId,
      });
      await createNumero({
        _bal: balId,
        voie: voieId,
        numero: 1,
        comment: 'coucou',
        toponyme: toponymeId,
      });

      const response = await request(app.getHttpServer())
        .get(`/toponymes/${toponymeId}/numeros`)
        .set('authorization', `Bearer ${token}`)
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

  describe('PUT /toponymes', () => {
    it('Return 200', async () => {
      const balId = await createBal();
      const toponymeId = await createToponyme({
        nom: 'rue de la paix',
        _bal: balId,
        commune: '97800',
      });
      const changes: UpdateToponymeDto = {
        nom: 'coucou',
        nomAlt: null,
        parcelles: ['12345000AA0002', '12345000AA0005'],
        positions: createPositions(),
      };

      const response = await request(app.getHttpServer())
        .put(`/toponymes/${toponymeId}`)
        .send(changes)
        .set('authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body._id).toEqual(toponymeId.toString());
      expect(response.body._bal).toEqual(balId.toString());
      expect(response.body.nom).toEqual('coucou');
      expect(response.body.parcelles).toEqual([
        '12345000AA0002',
        '12345000AA0005',
      ]);
      expect(response.body.positions).toBeDefined();

      const bal = await balModel.findOne(balId);
      expect(bal._updated.toISOString()).not.toEqual(_updated.toISOString());
    });

    it('Return 403', async () => {
      const balId = await createBal();
      const toponymeId = await createToponyme({
        nom: 'rue de la paix',
        _bal: balId,
        commune: '97800',
      });

      const changes: UpdateToponymeDto = {
        nom: 'coucou',
        nomAlt: null,
        parcelles: ['12345000AA0002', '12345000AA0005'],
        positions: createPositions(),
      };

      await request(app.getHttpServer())
        .put(`/toponymes/${toponymeId}`)
        .send(changes)
        .expect(403);

      const toponyme = await toponymeModel.findOne(toponymeId);
      expect(toponyme.nom).toEqual('rue de la paix');
      expect(toponyme.parcelles).toEqual([]);
      expect(toponyme.positions).toEqual([]);

      const bal = await balModel.findOne(balId);
      expect(bal._updated.toISOString()).toEqual(_updated.toISOString());
    });
  });

  describe('PUT /soft-delete', () => {
    it('Return 200', async () => {
      const balId = await createBal();
      const toponymeId = await createToponyme({
        nom: 'rue de la paix',
        _bal: balId,
        commune: '97800',
      });
      const numeroId = await createNumero({
        numero: 1,
        toponyme: toponymeId,
      });

      const response = await request(app.getHttpServer())
        .put(`/toponymes/${toponymeId}/soft-delete`)
        .set('authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body._deleted).not.toBeNull();

      const bal = await balModel.findOne(balId);
      expect(bal._updated.toISOString()).not.toEqual(_updated.toISOString());

      const numero = await numeroModel.findOne(numeroId);
      expect(numero.toponyme).toBeNull();
    });

    it('Return 403', async () => {
      const balId = await createBal();
      const toponymeId = await createToponyme({
        nom: 'rue de la paix',
        _bal: balId,
        commune: '97800',
        _deleted: null,
      });
      await request(app.getHttpServer())
        .put(`/toponymes/${toponymeId}/soft-delete`)
        .expect(403);

      const toponyme = await toponymeModel.findOne(toponymeId);
      expect(toponyme._deleted).toBeNull();

      const bal = await balModel.findOne(balId);
      expect(bal._updated.toISOString()).toEqual(_updated.toISOString());
    });
  });

  describe('PUT /restore', () => {
    it('Return 200', async () => {
      const balId = await createBal();
      const toponymeId = await createToponyme({
        nom: 'rue de la paix',
        _bal: balId,
        commune: '97800',
        _deleted: _updated,
      });
      const response = await request(app.getHttpServer())
        .put(`/toponymes/${toponymeId}/restore`)
        .set('authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body._deleted).toBeNull();

      const bal = await balModel.findOne(balId);
      expect(bal._updated.toISOString()).not.toEqual(_updated.toISOString());
    });

    it('Return 403', async () => {
      const balId = await createBal();
      const toponymeId = await createToponyme({
        nom: 'rue de la paix',
        _bal: balId,
        commune: '97800',
        _deleted: _updated,
      });
      const response = await request(app.getHttpServer())
        .put(`/toponymes/${toponymeId}/restore`)
        .expect(403);

      expect(response.body._deleted).not.toBeNull();

      const bal = await balModel.findOne(balId);
      expect(bal._updated.toISOString()).toEqual(_updated.toISOString());
    });
  });

  describe('DELETE /toponymes', () => {
    it('Return 200', async () => {
      const balId = await createBal();
      const toponymeId = await createToponyme({
        nom: 'rue de la paix',
        _bal: balId,
        commune: '97800',
      });
      await request(app.getHttpServer())
        .delete(`/toponymes/${toponymeId}`)
        .set('authorization', `Bearer ${token}`)
        .expect(204);

      const voie = await toponymeModel.findOne(toponymeId);
      expect(voie).toBeNull();

      const bal = await balModel.findOne(balId);
      expect(bal._updated.toISOString()).not.toEqual(_updated.toISOString());
    });

    it('Return 403', async () => {
      const balId = await createBal();
      const toponymeId = await createToponyme({
        nom: 'rue de la paix',
        _bal: balId,
        commune: '97800',
      });

      await request(app.getHttpServer())
        .delete(`/toponymes/${toponymeId}`)
        .expect(403);

      const toponyme = await toponymeModel.findOne(toponymeId);
      expect(toponyme).not.toBeNull();

      const bal = await balModel.findOne(balId);
      expect(bal._updated.toISOString()).toEqual(_updated.toISOString());
    });
  });
});
