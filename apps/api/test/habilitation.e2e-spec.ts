import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Connection, connect, Model, Types } from 'mongoose';

import { BaseLocale } from '@/shared/schemas/base_locale/base_locale.schema';

import { StatusBaseLocalEnum } from '@/shared/schemas/base_locale/status.enum';
import { HabilitationModule } from '@/modules/base_locale/sub_modules/habilitation/habilitation.module';
import MockAdapter from 'axios-mock-adapter';
import axios from 'axios';
import {
  Habilitation,
  StatusHabiliation,
} from '@/shared/modules/api_depot/types/habilitation.type';
import { add } from 'date-fns';

describe('HABILITATION MODULE', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;
  let balModel: Model<BaseLocale>;
  // VAR
  const token = 'xxxx';
  const _created = new Date('2000-01-01');
  const _updated = new Date('2000-01-02');

  const axiosMock = new MockAdapter(axios);

  beforeAll(async () => {
    // INIT DB
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    mongoConnection = (await connect(uri)).connection;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [MongooseModule.forRoot(uri), HabilitationModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    balModel = app.get<Model<BaseLocale>>(getModelToken(BaseLocale.name));
  });

  afterAll(async () => {
    await mongoConnection.dropDatabase();
    await mongoConnection.close();
    await mongod.stop();
    await app.close();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    axiosMock.reset();
    await balModel.deleteMany({});
  });

  async function createBal(props: Partial<BaseLocale> = {}) {
    const balId = new Types.ObjectId();
    const bal: Partial<BaseLocale> = {
      _id: balId,
      _created,
      _updated,
      status: props.status ?? StatusBaseLocalEnum.DRAFT,
      token,
      ...props,
    };
    await balModel.create(bal);
    return balId;
  }

  describe('GET /bases-locales/:id/habilitation', () => {
    it('expect 200 with admin token', async () => {
      const habilitationId = new Types.ObjectId();
      const commune = '91534';
      const balId = await createBal({
        nom: 'BAL de test',
        commune,
        emails: ['test@test.fr'],
        token,
        status: StatusBaseLocalEnum.PUBLISHED,
        _habilitation: habilitationId.toString(),
      });

      const habilitation: Habilitation = {
        _id: habilitationId.toString(),
        status: StatusHabiliation.ACCEPTED,
        expiresAt: add(new Date(), { months: 1 }),
        codeCommune: commune,
        emailCommune: 'test@test.fr',
      };
      axiosMock
        .onGet(`habilitations/${habilitationId}`)
        .reply(200, habilitation);

      const response = await request(app.getHttpServer())
        .get(`/bases-locales/${balId}/habilitation`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(JSON.stringify(response.body)).toEqual(
        JSON.stringify(habilitation),
      );
    });

    it('expect 403 without admin token', async () => {
      const habilitationId = new Types.ObjectId();
      const commune = '91534';
      const balId = await createBal({
        nom: 'BAL de test',
        commune,
        emails: ['test@test.fr'],
        token,
        status: StatusBaseLocalEnum.PUBLISHED,
        _habilitation: habilitationId.toString(),
      });

      const habilitation: Habilitation = {
        _id: habilitationId.toString(),
        status: StatusHabiliation.ACCEPTED,
        expiresAt: add(new Date(), { months: 1 }),
        codeCommune: commune,
        emailCommune: 'test@test.fr',
      };
      axiosMock
        .onGet(`habilitations/${habilitationId}`)
        .reply(200, habilitation);

      await request(app.getHttpServer())
        .get(`/bases-locales/${balId}/habilitation`)
        .expect(403);
    });

    it('expect 404 with admin token', async () => {
      const habilitationId = new Types.ObjectId();
      const commune = '91534';
      const balId = await createBal({
        nom: 'BAL de test',
        commune,
        emails: ['test@test.fr'],
        token,
        status: StatusBaseLocalEnum.PUBLISHED,
        _habilitation: habilitationId.toString(),
      });
      const responseBody = {
        code: 404,
        message: 'L’identifiant de l’habilitation demandé n’existe pas',
      };
      axiosMock
        .onGet(`habilitations/${habilitationId}`)
        .reply(404, responseBody);

      const response = await request(app.getHttpServer())
        .get(`/bases-locales/${balId}/habilitation`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body).toEqual(responseBody);
    });
  });

  describe('POST /bases-locales/:id/habilitation', () => {
    it('expect 201 Create habilitation', async () => {
      const habilitationId = new Types.ObjectId();
      const commune = '91534';
      const balId = await createBal({
        nom: 'BAL de test',
        commune,
        emails: ['test@test.fr'],
        token,
        status: StatusBaseLocalEnum.DRAFT,
      });

      const habilitation: Habilitation = {
        _id: habilitationId.toString(),
        status: StatusHabiliation.ACCEPTED,
        expiresAt: add(new Date(), { months: 1 }),
        codeCommune: commune,
        emailCommune: 'test@test.fr',
      };
      axiosMock
        .onPost(`communes/${commune}/habilitations`)
        .reply(201, habilitation);

      const response = await request(app.getHttpServer())
        .post(`/bases-locales/${balId}/habilitation`)
        .set('Authorization', `Bearer ${token}`)
        .expect(201);

      expect(JSON.stringify(response.body)).toEqual(
        JSON.stringify(habilitation),
      );

      const updatedBAL = await balModel.findById(balId);
      expect(updatedBAL._habilitation).toBe(habilitation._id);
    });

    it('expect 412 BAL already has habilitation', async () => {
      const habilitationId = new Types.ObjectId();
      const commune = '91534';
      const balId = await createBal({
        nom: 'BAL de test',
        commune,
        emails: ['test@test.fr'],
        token,
        status: StatusBaseLocalEnum.DRAFT,
        _habilitation: habilitationId.toString(),
      });

      const habilitation: Habilitation = {
        _id: habilitationId.toString(),
        status: StatusHabiliation.ACCEPTED,
        expiresAt: add(new Date(), { months: 1 }),
        codeCommune: commune,
        emailCommune: 'test@test.fr',
      };

      axiosMock
        .onGet(`habilitations/${habilitationId}`)
        .reply(200, habilitation);

      const response = await request(app.getHttpServer())
        .post(`/bases-locales/${balId}/habilitation`)
        .set('Authorization', `Bearer ${token}`)
        .expect(412);

      expect(response.body).toEqual({
        statusCode: 412,
        message: 'Cette Base Adresse Locale possède déjà une habilitation',
      });
    });
  });

  describe('POST /bases-locales/:id/habilitation/email/send-pin-code', () => {
    it('expect 200', async () => {
      const habilitationId = new Types.ObjectId();
      const commune = '91534';
      const balId = await createBal({
        nom: 'BAL de test',
        commune,
        emails: ['test@test.fr'],
        token,
        status: StatusBaseLocalEnum.DRAFT,
        _habilitation: habilitationId.toString(),
      });

      const habilitation: Habilitation = {
        _id: habilitationId.toString(),
        status: StatusHabiliation.PENDING,
        expiresAt: add(new Date(), { months: 1 }),
        codeCommune: commune,
        emailCommune: 'test@test.fr',
      };

      axiosMock
        .onGet(`habilitations/${habilitationId}`)
        .reply(200, habilitation);

      axiosMock
        .onPost(
          `habilitations/${habilitationId}/authentication/email/send-pin-code`,
        )
        .reply(200, {
          code: 200,
          message: 'OK',
        });

      const response = await request(app.getHttpServer())
        .post(`/bases-locales/${balId}/habilitation/email/send-pin-code`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual({
        code: 200,
        message: 'OK',
      });
    });

    it('expect 412 no pending habilitation', async () => {
      const habilitationId = new Types.ObjectId();
      const commune = '91534';
      const balId = await createBal({
        nom: 'BAL de test',
        commune,
        emails: ['test@test.fr'],
        token,
        status: StatusBaseLocalEnum.DRAFT,
        _habilitation: habilitationId.toString(),
      });

      const habilitation: Habilitation = {
        _id: habilitationId.toString(),
        status: StatusHabiliation.ACCEPTED,
        expiresAt: add(new Date(), { months: 1 }),
        codeCommune: commune,
        emailCommune: 'test@test.fr',
      };

      axiosMock
        .onGet(`habilitations/${habilitationId}`)
        .reply(200, habilitation);

      const response = await request(app.getHttpServer())
        .post(`/bases-locales/${balId}/habilitation/email/send-pin-code`)
        .set('Authorization', `Bearer ${token}`)
        .expect(412);

      expect(response.body).toEqual({
        statusCode: 412,
        message: 'Aucune demande d’habilitation en attente',
      });
    });
  });

  describe('POST /bases-locales/:id/habilitation/email/validate-pin-code', () => {
    it('expect 200', async () => {
      const habilitationId = new Types.ObjectId();
      const commune = '91534';
      const balId = await createBal({
        nom: 'BAL de test',
        commune,
        emails: ['test@test.fr'],
        token,
        status: StatusBaseLocalEnum.DRAFT,
        _habilitation: habilitationId.toString(),
      });

      const habilitation: Habilitation = {
        _id: habilitationId.toString(),
        status: StatusHabiliation.PENDING,
        expiresAt: add(new Date(), { months: 1 }),
        codeCommune: commune,
        emailCommune: 'test@test.fr',
      };

      const acceptedHabilitation: Habilitation = {
        ...habilitation,
        status: StatusHabiliation.ACCEPTED,
      };

      axiosMock
        .onGet(`habilitations/${habilitationId}`)
        .reply(200, habilitation);

      axiosMock
        .onPost(
          `habilitations/${habilitationId}/authentication/email/validate-pin-code`,
        )
        .reply(200, acceptedHabilitation);

      const response = await request(app.getHttpServer())
        .post(`/bases-locales/${balId}/habilitation/email/validate-pin-code`)
        .set('Authorization', `Bearer ${token}`)
        .send({ code: '123456' })
        .expect(200);

      expect(JSON.stringify(response.body)).toEqual(
        JSON.stringify({ validated: true }),
      );
    });

    it('expect 200 incorrect PIN code', async () => {
      const habilitationId = new Types.ObjectId();
      const commune = '91534';
      const balId = await createBal({
        nom: 'BAL de test',
        commune,
        emails: ['test@test.fr'],
        token,
        status: StatusBaseLocalEnum.DRAFT,
        _habilitation: habilitationId.toString(),
      });

      const habilitation: Habilitation = {
        _id: habilitationId.toString(),
        status: StatusHabiliation.PENDING,
        expiresAt: add(new Date(), { months: 1 }),
        codeCommune: commune,
        emailCommune: 'test@test.fr',
      };

      const validationResponse = {
        validated: false,
        error: 'Code non valide, 9 tentatives restantes',
        remainingAttempts: 9,
      };

      axiosMock
        .onGet(`habilitations/${habilitationId}`)
        .reply(200, habilitation);

      axiosMock
        .onPost(
          `habilitations/${habilitationId}/authentication/email/validate-pin-code`,
        )
        .reply(200, validationResponse);

      const response = await request(app.getHttpServer())
        .post(`/bases-locales/${balId}/habilitation/email/validate-pin-code`)
        .set('Authorization', `Bearer ${token}`)
        .send({ code: '123456' })
        .expect(200);

      expect(JSON.stringify(response.body)).toEqual(
        JSON.stringify({ validated: false }),
      );
    });

    it('expect 412 no pending habilitation', async () => {
      const habilitationId = new Types.ObjectId();
      const commune = '91534';
      const balId = await createBal({
        nom: 'BAL de test',
        commune,
        emails: ['test@test.fr'],
        token,
        status: StatusBaseLocalEnum.DRAFT,
        _habilitation: habilitationId.toString(),
      });

      const habilitation: Habilitation = {
        _id: habilitationId.toString(),
        status: StatusHabiliation.REJECTED,
        expiresAt: add(new Date(), { months: 1 }),
        codeCommune: commune,
        emailCommune: 'test@test.fr',
      };

      axiosMock
        .onGet(`habilitations/${habilitationId}`)
        .reply(200, habilitation);

      const response = await request(app.getHttpServer())
        .post(`/bases-locales/${balId}/habilitation/email/validate-pin-code`)
        .set('Authorization', `Bearer ${token}`)
        .send({ code: '123456' })
        .expect(200);

      expect(response.body).toEqual({
        validated: false,
        message: 'Aucune demande d’habilitation en attente',
      });
    });
  });
});
