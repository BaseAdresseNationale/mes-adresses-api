import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Connection, connect, Model, Types } from 'mongoose';
import axios from 'axios';
import { add, sub } from 'date-fns';
import MockAdapter from 'axios-mock-adapter';
import * as nodemailer from 'nodemailer';
import { v4 as uuid } from 'uuid';

import { Numero } from '@/shared/schemas/numero/numero.schema';
import { Voie } from '@/shared/schemas/voie/voie.schema';
import { Toponyme } from '@/shared/schemas/toponyme/toponyme.schema';
import { BaseLocale } from '@/shared/schemas/base_locale/base_locale.schema';
import { PositionTypeEnum } from '@/shared/schemas/position_type.enum';
import { Position } from '@/shared/schemas/position.schema';
import {
  StatusBaseLocalEnum,
  StatusSyncEnum,
} from '@/shared/schemas/base_locale/status.enum';
import {
  Habilitation,
  StatusHabiliation,
} from '@/shared/modules/api_depot/types/habilitation.type';
import {
  Revision,
  StatusRevision,
} from '@/shared/modules/api_depot/types/revision.type';

import { BaseLocaleModule } from '@/modules/base_locale/base_locale.module';

jest.mock('nodemailer');

const createTransport = nodemailer.createTransport;

describe('PUBLICATION MODULE', () => {
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
  // AXIOS
  const axiosMock = new MockAdapter(axios);
  // NODEMAILER
  const sendMailMock = jest.fn();
  createTransport.mockReturnValue({ sendMail: sendMailMock });

  beforeAll(async () => {
    // INIT DB
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    mongoConnection = (await connect(uri)).connection;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [MongooseModule.forRoot(uri), BaseLocaleModule],
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
    jest.clearAllMocks();
    axiosMock.reset();
    await toponymeModel.deleteMany({});
    await voieModel.deleteMany({});
    await balModel.deleteMany({});
    await numeroModel.deleteMany({});
  });

  async function createBal(props: Partial<BaseLocale> = {}) {
    const balId = new Types.ObjectId();
    const bal: Partial<BaseLocale> = {
      _id: balId,
      token,
      _created,
      _updated,
      ...props,
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
        type: PositionTypeEnum.ENTREE,
        source: 'ban',
        point: {
          type: 'Point',
          coordinates,
        },
      },
    ];
  }

  describe('POST /bases-locales/sync/exec', () => {
    it('Publish 200 DRAFT', async () => {
      const commune = '91534';
      const habilitationId = new Types.ObjectId();
      const communeUuid = uuid();
      const balId = await createBal({
        commune,
        banId: communeUuid,
        _habilitation: habilitationId.toString(),
        status: StatusBaseLocalEnum.DRAFT,
        emails: ['test@test.fr'],
      });
      const toponymeUuid = uuid();
      const voieId = await createVoie({
        nom: 'rue de la paix',
        commune,
        _bal: balId,
        banId: toponymeUuid,
      });
      const numeroUuid = uuid();
      await createNumero({
        _bal: balId,
        banId: numeroUuid,
        voie: voieId,
        numero: 1,
        suffixe: 'bis',
        positions: createPositions(),
        certifie: true,
        commune,
        _updated: new Date('2000-01-01'),
      });

      // MOCK AXIOS
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

      const revisionId = new Types.ObjectId();
      const revision: Revision = {
        _id: revisionId.toString(),
        codeCommune: commune,
        status: StatusRevision.PENDING,
        ready: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        current: false,
        validation: {
          valid: true,
        },
      };
      axiosMock.onPost(`/communes/${commune}/revisions`).reply(200, revision);

      axiosMock.onPost(`/revisions/${revisionId}/compute`).reply(200, revision);

      const csvFile = `cle_interop;id_ban_commune;id_ban_toponyme;id_ban_adresse;voie_nom;lieudit_complement_nom;numero;suffixe;certification_commune;commune_insee;commune_nom;position;long;lat;x;y;cad_parcelles;source;date_der_maj
    91534_xxxx_00001_bis;${communeUuid};${toponymeUuid};${numeroUuid};rue de la paix;;1;bis;1;91534;Saclay;entrée;8;42;1114835.92;6113076.85;;ban;2000-01-01`;
      axiosMock
        .onPut(`/revisions/${revisionId}/files/bal`)
        .reply(({ data }) => {
          expect(data.replace(/\s/g, '')).toEqual(csvFile.replace(/\s/g, ''));
          return [200, null];
        });

      const publishedRevision: Revision = {
        _id: revisionId.toString(),
        codeCommune: commune,
        status: StatusRevision.PUBLISHED,
        ready: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        current: true,
        validation: {
          valid: true,
        },
      };
      axiosMock.onPost(`/revisions/${revisionId}/publish`).reply(({ data }) => {
        expect(JSON.parse(data).habilitationId).toEqual(
          habilitationId.toString(),
        );
        return [200, publishedRevision];
      });

      // SEND REQUEST
      const response = await request(app.getHttpServer())
        .post(`/bases-locales/${balId}/sync/exec`)
        .set('authorization', `Bearer ${token}`)
        .expect(200);
      expect(sendMailMock).toHaveBeenCalled();

      const syncExpected = {
        currentUpdated: _updated.toISOString(),
        status: StatusSyncEnum.SYNCED,
        isPaused: false,
        lastUploadedRevisionId: revisionId.toString(),
      };

      expect(response.body._id).toEqual(balId.toString());
      expect(response.body.commune).toEqual(commune);
      expect(response.body.status).toEqual(StatusBaseLocalEnum.PUBLISHED);
      expect(response.body.sync).toEqual(syncExpected);
    });

    it('Publish 200 OUTDATED', async () => {
      const commune = '91534';
      const habilitationId = new Types.ObjectId();
      // REVSION
      const revisionId = new Types.ObjectId();
      const revision: Revision = {
        _id: revisionId.toString(),
        codeCommune: commune,
        status: StatusRevision.PENDING,
        ready: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        current: false,
        validation: {
          valid: true,
        },
        files: [
          {
            type: 'bal',
            hash: '',
          },
        ],
      };

      // BAL
      const communeUuid = uuid();
      const balId = await createBal({
        commune,
        banId: communeUuid,
        _habilitation: habilitationId.toString(),
        status: StatusBaseLocalEnum.PUBLISHED,
        emails: ['test@test.fr'],
        sync: {
          status: StatusSyncEnum.OUTDATED,
          lastUploadedRevisionId: revisionId,
        },
      });
      const toponymeUuid = uuid();
      const voieId = await createVoie({
        nom: 'rue de la paix',
        commune,
        _bal: balId,
        banId: toponymeUuid,
      });
      const numeroUuid = uuid();
      await createNumero({
        _bal: balId,
        banId: numeroUuid,
        voie: voieId,
        numero: 1,
        suffixe: 'bis',
        positions: createPositions(),
        certifie: true,
        commune,
        _updated: new Date('2000-01-01'),
      });

      // MOCK AXIOS
      axiosMock
        .onGet(`/communes/${commune}/current-revision`)
        .reply(200, revision);

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

      axiosMock.onPost(`/communes/${commune}/revisions`).reply(200, revision);

      axiosMock.onPost(`/revisions/${revisionId}/compute`).reply(200, revision);

      const csvFile = `cle_interop;id_ban_commune;id_ban_toponyme;id_ban_adresse;voie_nom;lieudit_complement_nom;numero;suffixe;certification_commune;commune_insee;commune_nom;position;long;lat;x;y;cad_parcelles;source;date_der_maj
    91534_xxxx_00001_bis;${communeUuid};${toponymeUuid};${numeroUuid};rue de la paix;;1;bis;1;91534;Saclay;entrée;8;42;1114835.92;6113076.85;;ban;2000-01-01`;
      axiosMock
        .onPut(`/revisions/${revisionId}/files/bal`)
        .reply(({ data }) => {
          expect(data.replace(/\s/g, '')).toEqual(csvFile.replace(/\s/g, ''));
          return [200, null];
        });

      const publishedRevision: Revision = {
        _id: revisionId.toString(),
        codeCommune: commune,
        status: StatusRevision.PUBLISHED,
        ready: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        current: true,
        validation: {
          valid: true,
        },
      };
      axiosMock.onPost(`/revisions/${revisionId}/publish`).reply(({ data }) => {
        expect(JSON.parse(data).habilitationId).toEqual(
          habilitationId.toString(),
        );
        return [200, publishedRevision];
      });

      // SEND REQUEST
      const response = await request(app.getHttpServer())
        .post(`/bases-locales/${balId}/sync/exec`)
        .set('authorization', `Bearer ${token}`)
        .expect(200);

      expect(sendMailMock).not.toHaveBeenCalled();

      const syncExpected = {
        currentUpdated: _updated.toISOString(),
        status: StatusSyncEnum.SYNCED,
        isPaused: false,
        lastUploadedRevisionId: revisionId.toString(),
      };

      expect(response.body._id).toEqual(balId.toString());
      expect(response.body.commune).toEqual(commune);
      expect(response.body.status).toEqual(StatusBaseLocalEnum.PUBLISHED);
      expect(response.body.sync).toEqual(syncExpected);
    });

    it('Publish 200 OUTDATED same hash', async () => {
      const commune = '91534';
      const habilitationId = new Types.ObjectId();
      // REVSION
      const revisionId = new Types.ObjectId();
      const revision: Revision = {
        _id: revisionId.toString(),
        codeCommune: commune,
        status: StatusRevision.PENDING,
        ready: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        current: false,
        validation: {
          valid: true,
        },
        files: [
          {
            type: 'bal',
            hash: '8d0cda05e7b8b58a92a18cd40d0549c1d3f8ac1ac9586243aa0e3f885bb870c4',
          },
        ],
      };

      // BAL
      const balId = await createBal({
        commune,
        _habilitation: habilitationId.toString(),
        status: StatusBaseLocalEnum.PUBLISHED,
        emails: ['test@test.fr'],
        sync: {
          status: StatusSyncEnum.OUTDATED,
          lastUploadedRevisionId: revisionId,
        },
      });
      const voieId = await createVoie({
        nom: 'rue de la paix',
        commune,
        _bal: balId,
      });
      await createNumero({
        _bal: balId,
        voie: voieId,
        numero: 1,
        suffixe: 'bis',
        positions: createPositions(),
        certifie: true,
        commune,
        _updated: new Date('2000-01-01'),
      });

      // MOCK AXIOS
      axiosMock
        .onGet(`/communes/${commune}/current-revision`)
        .reply(200, revision);

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

      // SEND REQUEST
      const response = await request(app.getHttpServer())
        .post(`/bases-locales/${balId}/sync/exec`)
        .set('authorization', `Bearer ${token}`)
        .expect(200);

      expect(sendMailMock).not.toHaveBeenCalled();

      const syncExpected = {
        currentUpdated: _updated.toISOString(),
        status: StatusSyncEnum.SYNCED,
        isPaused: false,
        lastUploadedRevisionId: revisionId.toString(),
      };

      expect(response.body._id).toEqual(balId.toString());
      expect(response.body.commune).toEqual(commune);
      expect(response.body.status).toEqual(StatusBaseLocalEnum.PUBLISHED);
      expect(response.body.sync).toEqual(syncExpected);
    });

    it('Publish 412 status DEMO', async () => {
      const commune = '91534';
      const habilitationId = new Types.ObjectId();
      const balId = await createBal({
        commune,
        _habilitation: habilitationId.toString(),
        status: StatusBaseLocalEnum.DEMO,
        emails: ['test@test.fr'],
      });

      // SEND REQUEST
      const response = await request(app.getHttpServer())
        .post(`/bases-locales/${balId}/sync/exec`)
        .set('authorization', `Bearer ${token}`)
        .expect(412);

      expect(response.text).toEqual(
        JSON.stringify({
          statusCode: 412,
          message:
            'La synchronisation pas possibles pour les Bases Adresses Locales de démo',
        }),
      );
    });

    it('Publish 412 no habilitation', async () => {
      const commune = '91534';
      const balId = await createBal({
        commune,
        status: StatusBaseLocalEnum.DRAFT,
        emails: ['test@test.fr'],
      });

      // SEND REQUEST
      const response = await request(app.getHttpServer())
        .post(`/bases-locales/${balId}/sync/exec`)
        .set('authorization', `Bearer ${token}`)
        .expect(412);

      expect(response.text).toEqual(
        JSON.stringify({
          statusCode: 412,
          message: 'Aucune habilitation rattachée à cette Base Adresse Locale',
        }),
      );
    });

    it('Publish 412 habilitation PENDING', async () => {
      const commune = '91534';
      const habilitationId = new Types.ObjectId();
      const balId = await createBal({
        commune,
        _habilitation: habilitationId.toString(),
        status: StatusBaseLocalEnum.DRAFT,
        emails: ['test@test.fr'],
      });

      // MOCK AXIOS
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

      // SEND REQUEST
      const response = await request(app.getHttpServer())
        .post(`/bases-locales/${balId}/sync/exec`)
        .set('authorization', `Bearer ${token}`)
        .expect(412);

      expect(response.text).toEqual(
        JSON.stringify({
          statusCode: 412,
          message: 'L’habilitation rattachée n’est pas une habilitation valide',
        }),
      );
    });

    it('Publish 412 habilitation expired', async () => {
      const commune = '91534';
      const habilitationId = new Types.ObjectId();
      const balId = await createBal({
        commune,
        _habilitation: habilitationId.toString(),
        status: StatusBaseLocalEnum.DRAFT,
        emails: ['test@test.fr'],
      });

      // MOCK AXIOS
      const habilitation: Habilitation = {
        _id: habilitationId.toString(),
        status: StatusHabiliation.ACCEPTED,
        expiresAt: sub(new Date(), { months: 1 }),
        codeCommune: commune,
        emailCommune: 'test@test.fr',
      };
      axiosMock
        .onGet(`habilitations/${habilitationId}`)
        .reply(200, habilitation);

      // SEND REQUEST
      const response = await request(app.getHttpServer())
        .post(`/bases-locales/${balId}/sync/exec`)
        .set('authorization', `Bearer ${token}`)
        .expect(412);

      expect(response.text).toEqual(
        JSON.stringify({
          statusCode: 412,
          message: 'L’habilitation rattachée a expiré',
        }),
      );
    });

    it('Publish 412 no numero', async () => {
      const commune = '91534';
      const habilitationId = new Types.ObjectId();
      const balId = await createBal({
        commune,
        _habilitation: habilitationId.toString(),
        status: StatusBaseLocalEnum.DRAFT,
        emails: ['test@test.fr'],
      });

      // MOCK AXIOS
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

      // SEND REQUEST
      const response = await request(app.getHttpServer())
        .post(`/bases-locales/${balId}/sync/exec`)
        .set('authorization', `Bearer ${token}`)
        .expect(412);

      expect(response.text).toEqual(
        JSON.stringify({
          statusCode: 412,
          message: 'La base locale ne possède aucune adresse',
        }),
      );
    });
  });
});
