import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Connection, connect, Model, Types } from 'mongoose';

import { Numero } from '@/modules/numeros/schema/numero.schema';
import { Voie } from '@/modules/voie/schema/voie.schema';
import { Toponyme } from '@/modules/toponyme/schema/toponyme.schema';
import { BaseLocale } from '@/modules/base_locale/schema/base_locale.schema';
import { ToponymeModule } from '@/modules/toponyme/toponyme.module';

describe('TOPONYME MODULE', () => {
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
        ToponymeModule
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
