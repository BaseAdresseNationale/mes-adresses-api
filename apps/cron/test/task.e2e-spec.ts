import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Connection, connect, Model, Types } from 'mongoose';
import * as nodemailer from 'nodemailer';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';

import { Numero, NumeroSchema } from '@/shared/schemas/numero/numero.schema';
import { Voie, VoieSchema } from '@/shared/schemas/voie/voie.schema';
import {
  Toponyme,
  ToponymeSchema,
} from '@/shared/schemas/toponyme/toponyme.schema';
import {
  BaseLocale,
  BaseLocaleSchema,
} from '@/shared/schemas/base_locale/base_locale.schema';
import { PositionTypeEnum } from '@/shared/schemas/position_type.enum';
import { Position } from '@/shared/schemas/position.schema';

import { DetectOutdatedTask } from '../src/tasks/detect_outdated.task';
import {
  StatusBaseLocalEnum,
  StatusSyncEnum,
} from '@/shared/schemas/base_locale/status.enum';
import {
  DetectConflictTask,
  KEY_DETECT_CONFLICT_PUBLISHED_SINCE,
} from '../src/tasks/detect_conflict.task';
import { CacheService } from '@/shared/modules/cache/cache.service';
import {
  Revision,
  StatusRevision,
} from '@/shared/modules/api_depot/types/revision.type';
import { add, sub } from 'date-fns';
import {
  Habilitation,
  StatusHabiliation,
} from '@/shared/modules/api_depot/types/habilitation.type';
import { SyncOutdatedTask } from '../src/tasks/sync_outdated.task';
import { ScheduleModule } from '@nestjs/schedule';
import { ApiDepotModule } from '@/shared/modules/api_depot/api_depot.module';
import { CacheModule } from '@/shared/modules/cache/cache.module';
import { PublicationModule } from '@/shared/modules/publication/publication.module';
import { CronService } from '../src/cron.service';

jest.mock('nodemailer');

const createTransport = nodemailer.createTransport;

describe('TASK MODULE', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;
  let numeroModel: Model<Numero>;
  let voieModel: Model<Voie>;
  let balModel: Model<BaseLocale>;
  let toponymeModel: Model<Toponyme>;
  // TASK
  let detectOutdated: DetectOutdatedTask;
  let detectConflict: DetectConflictTask;
  let cacheService: CacheService;
  let syncOutdatedTask: SyncOutdatedTask;
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
      imports: [
        MongooseModule.forRoot(uri),
        MongooseModule.forFeature([
          { name: BaseLocale.name, schema: BaseLocaleSchema },
          { name: Numero.name, schema: NumeroSchema },
          { name: Toponyme.name, schema: ToponymeSchema },
          { name: Voie.name, schema: VoieSchema },
        ]),
        ScheduleModule.forRoot(),
        ApiDepotModule,
        CacheModule,
        PublicationModule,
      ],
      providers: [
        CronService,
        DetectOutdatedTask,
        DetectConflictTask,
        SyncOutdatedTask,
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
    // INIT TASK
    detectOutdated = app.get<DetectOutdatedTask>(DetectOutdatedTask);
    detectConflict = app.get<DetectConflictTask>(DetectConflictTask);
    cacheService = app.get<CacheService>(CacheService);
    syncOutdatedTask = app.get<SyncOutdatedTask>(SyncOutdatedTask);
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
    axiosMock.reset();
    sendMailMock.mockReset();
  });

  async function createBal(props: Partial<BaseLocale> = {}) {
    const balId = new Types.ObjectId();
    const bal: Partial<BaseLocale> = {
      _id: balId,
      _created,
      _updated,
      token,
      ...props,
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

  it('detectOutdated', async () => {
    const balId = await createBal({
      sync: {
        status: StatusSyncEnum.SYNCED,
        lastUploadedRevisionId: new Types.ObjectId(),
        currentUpdated: new Date('2000-01-01'),
      },
      status: StatusBaseLocalEnum.PUBLISHED,
    });

    await detectOutdated.run();

    const resultBal = await balModel.findOne(balId);

    expect(resultBal.sync.status).toEqual(StatusSyncEnum.OUTDATED);
    expect(resultBal.sync.currentUpdated).not.toBeDefined();
  });

  it('detectConflict', async () => {
    const commune = '97354';
    const date = new Date('2000-01-01');
    await cacheService.set(KEY_DETECT_CONFLICT_PUBLISHED_SINCE, date);

    const revisionId = new Types.ObjectId();
    const revision: Revision = {
      _id: revisionId.toHexString(),
      codeCommune: commune,
      ready: true,
      current: true,
      updatedAt: new Date('2000-01-01'),
      createdAt: new Date('2000-01-01'),
    };

    axiosMock
      .onGet(`current-revisions?publishedSince=${date.toISOString()}`)
      .reply(200, [revision]);

    axiosMock
      .onGet(`/communes/${commune}/current-revision`)
      .reply(200, revision);

    const balId1 = await createBal({
      sync: {
        status: StatusSyncEnum.SYNCED,
        lastUploadedRevisionId: revisionId,
      },
      commune: commune,
      status: StatusBaseLocalEnum.PUBLISHED,
    });

    const balId2 = await createBal({
      sync: {
        status: StatusSyncEnum.SYNCED,
        lastUploadedRevisionId: new Types.ObjectId(),
      },
      commune: commune,
      status: StatusBaseLocalEnum.PUBLISHED,
    });

    await detectConflict.run();

    const resultDate = await cacheService.get(
      KEY_DETECT_CONFLICT_PUBLISHED_SINCE,
    );

    expect(date.toISOString()).not.toEqual(resultDate.toISOString());

    const bal1After = await balModel.findOne(balId1);
    const bal2After = await balModel.findOne(balId2);

    expect(bal1After.status).toEqual(StatusBaseLocalEnum.PUBLISHED);
    expect(bal1After.sync.status).toEqual(StatusSyncEnum.SYNCED);

    expect(bal2After.status).toEqual(StatusBaseLocalEnum.REPLACED);
    expect(bal2After.sync.status).toEqual(StatusSyncEnum.CONFLICT);
  });

  it('syncOutdated', async () => {
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
    axiosMock.onGet(`habilitations/${habilitationId}`).reply(200, habilitation);

    axiosMock.onPost(`/communes/${commune}/revisions`).reply(200, revision);

    axiosMock.onPost(`/revisions/${revisionId}/compute`).reply(200, revision);

    const csvFile = `cle_interop;id_ban_commune;id_ban_toponyme;id_ban_adresse;voie_nom;lieudit_complement_nom;numero;suffixe;certification_commune;commune_insee;commune_nom;position;long;lat;x;y;cad_parcelles;source;date_der_maj
  91534_xxxx_00001_bis;;;;rue de la paix;;1;bis;1;91534;Saclay;entrée;8;42;1114835.92;6113076.85;;ban;2000-01-01`;
    axiosMock.onPut(`/revisions/${revisionId}/files/bal`).reply(({ data }) => {
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

    await syncOutdatedTask.run();

    expect(sendMailMock).not.toHaveBeenCalled();

    const balResult = await balModel.findOne(balId);

    expect(balResult.status).toEqual(StatusBaseLocalEnum.PUBLISHED);
    expect(balResult.sync.currentUpdated.toISOString()).toEqual(
      _updated.toISOString(),
    );
    expect(balResult.sync.status).toEqual(StatusSyncEnum.SYNCED);
    expect(balResult.sync.isPaused).toEqual(false);
    expect(balResult.sync.lastUploadedRevisionId.toString()).toEqual(
      revisionId.toString(),
    );
  });

  it('syncOutdated same hash', async () => {
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
    axiosMock.onGet(`habilitations/${habilitationId}`).reply(200, habilitation);

    await syncOutdatedTask.run();

    expect(sendMailMock).not.toHaveBeenCalled();

    const balResult = await balModel.findOne(balId);

    expect(balResult.status).toEqual(StatusBaseLocalEnum.PUBLISHED);
    expect(balResult.sync.currentUpdated.toISOString()).toEqual(
      _updated.toISOString(),
    );
    expect(balResult.sync.status).toEqual(StatusSyncEnum.SYNCED);
    expect(balResult.sync.isPaused).toEqual(false);
    expect(balResult.sync.lastUploadedRevisionId.toString()).toEqual(
      revisionId.toString(),
    );
  });

  it('syncOutdated 412 no habilitation', async () => {
    const commune = '91534';
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
    const balId = await createBal({
      commune,
      status: StatusBaseLocalEnum.PUBLISHED,
      emails: ['test@test.fr'],
      sync: {
        status: StatusSyncEnum.OUTDATED,
        lastUploadedRevisionId: revisionId,
      },
    });

    // MOCK AXIOS
    axiosMock
      .onGet(`/communes/${commune}/current-revision`)
      .reply(200, revision);

    await syncOutdatedTask.run();

    const resultBal = await balModel.findOne(balId);
    expect(resultBal.sync.status).toEqual(StatusSyncEnum.OUTDATED);
    expect(resultBal.sync.lastUploadedRevisionId).toEqual(revisionId);
  });

  it('syncOutdated 412 habilitation PENDING', async () => {
    const commune = '91534';
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

    const habilitationId = new Types.ObjectId();
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

    // MOCK AXIOS
    axiosMock
      .onGet(`/communes/${commune}/current-revision`)
      .reply(200, revision);

    const habilitation: Habilitation = {
      _id: habilitationId.toString(),
      status: StatusHabiliation.PENDING,
      expiresAt: add(new Date(), { months: 1 }),
      codeCommune: commune,
      emailCommune: 'test@test.fr',
    };
    axiosMock.onGet(`habilitations/${habilitationId}`).reply(200, habilitation);

    await syncOutdatedTask.run();

    const resultBal = await balModel.findOne(balId);
    expect(resultBal.sync.status).toEqual(StatusSyncEnum.OUTDATED);
    expect(resultBal.sync.lastUploadedRevisionId).toEqual(revisionId);
  });

  it('syncOutdated 412 habilitation expired', async () => {
    const commune = '91534';
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

    const habilitationId = new Types.ObjectId();
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

    // MOCK AXIOS
    axiosMock
      .onGet(`/communes/${commune}/current-revision`)
      .reply(200, revision);

    const habilitation: Habilitation = {
      _id: habilitationId.toString(),
      status: StatusHabiliation.ACCEPTED,
      expiresAt: sub(new Date(), { months: 1 }),
      codeCommune: commune,
      emailCommune: 'test@test.fr',
    };
    axiosMock.onGet(`habilitations/${habilitationId}`).reply(200, habilitation);

    await syncOutdatedTask.run();

    const resultBal = await balModel.findOne(balId);
    expect(resultBal.sync.status).toEqual(StatusSyncEnum.OUTDATED);
    expect(resultBal.sync.lastUploadedRevisionId).toEqual(revisionId);
  });

  it('syncOutdated 412 no numero', async () => {
    const commune = '91534';
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

    const habilitationId = new Types.ObjectId();
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
    axiosMock.onGet(`habilitations/${habilitationId}`).reply(200, habilitation);

    await syncOutdatedTask.run();

    const resultBal = await balModel.findOne(balId);
    expect(resultBal.sync.status).toEqual(StatusSyncEnum.OUTDATED);
    expect(resultBal.sync.lastUploadedRevisionId).toEqual(revisionId);
  });
});
