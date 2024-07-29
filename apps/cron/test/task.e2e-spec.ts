import { Test, TestingModule } from '@nestjs/testing';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { Client } from 'pg';
import {
  Global,
  INestApplication,
  Module,
  ValidationPipe,
} from '@nestjs/common';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Connection, connect, Model, Types } from 'mongoose';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { v4 as uuid } from 'uuid';

import { Numero } from '@/shared/entities/numero.entity';
import { Voie } from '@/shared/entities/voie.entity';
import { Toponyme } from '@/shared/entities/toponyme.entity';
import { BaseLocale } from '@/shared/entities/base_locale.entity';
import { Position, PositionTypeEnum } from '@/shared/entities/position.entity';

import { DetectOutdatedTask } from '../src/tasks/detect_outdated.task';
import {
  StatusBaseLocalEnum,
  StatusSyncEnum,
} from '@/shared/schemas/base_locale/status.enum';
import {
  DetectConflictTask,
  KEY_DETECT_CONFLICT_PUBLISHED_SINCE,
} from '../src/tasks/detect_conflict.task';
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
import { ApiDepotModule } from '@/shared/modules/api_depot/api_depot.module';
import { PublicationModule } from '@/shared/modules/publication/publication.module';
import { MailerService } from '@nestjs-modules/mailer';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Point, Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

@Global()
@Module({
  providers: [
    {
      provide: MailerService,
      useValue: {
        sendMail: jest.fn(),
      },
    },
  ],
  exports: [MailerService],
})
class MailerModule {}

describe('TASK MODULE', () => {
  let app: INestApplication;
  // DB
  let postgresContainer: StartedPostgreSqlContainer;
  let postgresClient: Client;
  let numeroRepository: Repository<Numero>;
  let voieRepository: Repository<Voie>;
  let balRepository: Repository<BaseLocale>;
  let toponymeRepository: Repository<Toponyme>;
  // SERVICE
  let detectOutdated: DetectOutdatedTask;
  let detectConflict: DetectConflictTask;
  let syncOutdatedTask: SyncOutdatedTask;
  // VAR
  const token = 'xxxx';
  const createdAt = new Date('2000-01-01');
  const updatedAt = new Date('2000-01-02');
  // AXIOS
  const axiosMock = new MockAdapter(axios);

  beforeAll(async () => {
    // INIT DB
    postgresContainer = await new PostgreSqlContainer(
      'postgis/postgis:12-3.0',
    ).start();
    postgresClient = new Client({
      host: postgresContainer.getHost(),
      port: postgresContainer.getPort(),
      database: postgresContainer.getDatabase(),
      user: postgresContainer.getUsername(),
      password: postgresContainer.getPassword(),
    });
    await postgresClient.connect();
    // INIT MODULE
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: postgresContainer.getHost(),
          port: postgresContainer.getPort(),
          username: postgresContainer.getUsername(),
          password: postgresContainer.getPassword(),
          database: postgresContainer.getDatabase(),
          synchronize: true,
          entities: [BaseLocale, Voie, Numero, Toponyme, Position],
        }),
        TypeOrmModule.forFeature([BaseLocale]),
        ApiDepotModule,
        PublicationModule,
        MailerModule,
      ],
      providers: [
        DetectOutdatedTask,
        DetectConflictTask,
        SyncOutdatedTask,
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: () => 'any value',
            set: () => jest.fn(),
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    // INIT REPOSITORY
    numeroRepository = app.get(getRepositoryToken(Numero));
    voieRepository = app.get(getRepositoryToken(Voie));
    balRepository = app.get(getRepositoryToken(BaseLocale));
    toponymeRepository = app.get(getRepositoryToken(Toponyme));
    // INIT TASK
    detectOutdated = app.get<DetectOutdatedTask>(DetectOutdatedTask);
    detectConflict = app.get<DetectConflictTask>(DetectConflictTask);
    syncOutdatedTask = app.get<SyncOutdatedTask>(SyncOutdatedTask);
  });

  afterAll(async () => {
    await postgresClient.end();
    await postgresContainer.stop();
    await app.close();
  });

  afterEach(async () => {
    await numeroRepository.delete({});
    await voieRepository.delete({});
    await balRepository.delete({});
    await toponymeRepository.delete({});
    axiosMock.reset();
  });

  async function createBal(props: Partial<BaseLocale> = {}) {
    const payload: Partial<BaseLocale> = {
      banId: uuid(),
      createdAt,
      updatedAt,
      status: props.status ?? StatusBaseLocalEnum.DRAFT,
      token,
      ...props,
    };
    const entityToInsert = await balRepository.create(payload);
    const result = await balRepository.save(entityToInsert);
    return result.id;
  }

  async function createVoie(balId: string, props: Partial<Voie> = {}) {
    const payload: Partial<Voie> = {
      balId,
      banId: uuid(),
      createdAt,
      updatedAt,
      ...props,
    };
    const entityToInsert = await voieRepository.create(payload);
    const result = await voieRepository.save(entityToInsert);
    return result.id;
  }

  async function createNumero(
    balId: string,
    voieId: string,
    props: Partial<Numero> = {},
  ) {
    const payload: Partial<Numero> = {
      balId,
      banId: uuid(),
      voieId,
      createdAt,
      updatedAt,
      ...props,
    };
    const entityToInsert = await numeroRepository.create(payload);
    const result = await numeroRepository.save(entityToInsert);
    return result.id;
  }

  function createPositions(coordinates: number[] = [8, 42]): Position {
    const id = new Types.ObjectId().toHexString();
    const point: Point = {
      type: 'Point',
      coordinates,
    };
    return {
      id,
      type: PositionTypeEnum.INCONNUE,
      source: 'ban',
      point,
    } as Position;
  }

  it('detectOutdated', async () => {
    const balId = await createBal({
      nom: 'bal',
      commune: '91534',
      sync: {
        status: StatusSyncEnum.SYNCED,
        lastUploadedRevisionId: new Types.ObjectId().toHexString(),
        currentUpdated: new Date('2000-01-01'),
      },
      status: StatusBaseLocalEnum.PUBLISHED,
    });

    await detectOutdated.run();

    const resultBal = await balRepository.findOneBy({ id: balId });

    console.log(resultBal);
    expect(resultBal.sync.status).toEqual(StatusSyncEnum.OUTDATED);
    expect(resultBal.sync.currentUpdated).not.toBeDefined();
  });

  // it('detectConflict', async () => {
  //   const commune = '97354';
  //   const date = new Date('2000-01-01');
  //   await cacheService.set(KEY_DETECT_CONFLICT_PUBLISHED_SINCE, date);

  //   const revisionId = new Types.ObjectId();
  //   const revision: Revision = {
  //     _id: revisionId.toHexString(),
  //     codeCommune: commune,
  //     ready: true,
  //     current: true,
  //     updatedAt: new Date('2000-01-01'),
  //     createdAt: new Date('2000-01-01'),
  //   };

  //   axiosMock
  //     .onGet(`current-revisions?publishedSince=${date.toISOString()}`)
  //     .reply(200, [revision]);

  //   axiosMock
  //     .onGet(`/communes/${commune}/current-revision`)
  //     .reply(200, revision);

  //   const balId1 = await createBal({
  //     sync: {
  //       status: StatusSyncEnum.SYNCED,
  //       lastUploadedRevisionId: revisionId,
  //     },
  //     commune: commune,
  //     status: StatusBaseLocalEnum.PUBLISHED,
  //   });

  //   const balId2 = await createBal({
  //     sync: {
  //       status: StatusSyncEnum.SYNCED,
  //       lastUploadedRevisionId: new Types.ObjectId(),
  //     },
  //     commune: commune,
  //     status: StatusBaseLocalEnum.PUBLISHED,
  //   });

  //   await detectConflict.run();

  //   const resultDate = await cacheService.get(
  //     KEY_DETECT_CONFLICT_PUBLISHED_SINCE,
  //   );

  //   expect(date.toISOString()).not.toEqual(resultDate.toISOString());

  //   const bal1After = await balModel.findOne(balId1);
  //   const bal2After = await balModel.findOne(balId2);

  //   expect(bal1After.status).toEqual(StatusBaseLocalEnum.PUBLISHED);
  //   expect(bal1After.sync.status).toEqual(StatusSyncEnum.SYNCED);

  //   expect(bal2After.status).toEqual(StatusBaseLocalEnum.REPLACED);
  //   expect(bal2After.sync.status).toEqual(StatusSyncEnum.CONFLICT);
  // });

  // it('syncOutdated', async () => {
  //   const commune = '91534';
  //   const habilitationId = new Types.ObjectId();
  //   // REVSION
  //   const revisionId = new Types.ObjectId();
  //   const revision: Revision = {
  //     _id: revisionId.toString(),
  //     codeCommune: commune,
  //     status: StatusRevision.PENDING,
  //     ready: false,
  //     createdAt: new Date(),
  //     updatedAt: new Date(),
  //     current: false,
  //     validation: {
  //       valid: true,
  //     },
  //     files: [
  //       {
  //         type: 'bal',
  //         hash: '',
  //       },
  //     ],
  //   };

  //   // BAL
  //   const balId = await createBal({
  //     commune,
  //     _habilitation: habilitationId.toString(),
  //     status: StatusBaseLocalEnum.PUBLISHED,
  //     emails: ['test@test.fr'],
  //     sync: {
  //       status: StatusSyncEnum.OUTDATED,
  //       lastUploadedRevisionId: revisionId,
  //     },
  //   });
  //   const voieId = await createVoie({
  //     nom: 'rue de la paix',
  //     commune,
  //     _bal: balId,
  //   });
  //   await createNumero({
  //     _bal: balId,
  //     voie: voieId,
  //     numero: 1,
  //     suffixe: 'bis',
  //     positions: createPositions(),
  //     certifie: true,
  //     commune,
  //     _updated: new Date('2000-01-01'),
  //   });

  //   // MOCK AXIOS
  //   axiosMock
  //     .onGet(`/communes/${commune}/current-revision`)
  //     .reply(200, revision);

  //   const habilitation: Habilitation = {
  //     _id: habilitationId.toString(),
  //     status: StatusHabiliation.ACCEPTED,
  //     expiresAt: add(new Date(), { months: 1 }),
  //     codeCommune: commune,
  //     emailCommune: 'test@test.fr',
  //   };
  //   axiosMock.onGet(`habilitations/${habilitationId}`).reply(200, habilitation);

  //   axiosMock.onPost(`/communes/${commune}/revisions`).reply(200, revision);

  //   axiosMock.onPost(`/revisions/${revisionId}/compute`).reply(200, revision);

  //   const csvFile = `cle_interop;id_ban_commune;id_ban_toponyme;id_ban_adresse;voie_nom;lieudit_complement_nom;numero;suffixe;certification_commune;commune_insee;commune_nom;position;long;lat;x;y;cad_parcelles;source;date_der_maj
  // 91534_xxxx_00001_bis;;;;rue de la paix;;1;bis;1;91534;Saclay;inconnue;8;42;1114835.92;6113076.85;;ban;2000-01-01`;
  //   axiosMock.onPut(`/revisions/${revisionId}/files/bal`).reply(({ data }) => {
  //     expect(data.replace(/\s/g, '')).toEqual(csvFile.replace(/\s/g, ''));
  //     return [200, null];
  //   });

  //   const publishedRevision: Revision = {
  //     _id: revisionId.toString(),
  //     codeCommune: commune,
  //     status: StatusRevision.PUBLISHED,
  //     ready: true,
  //     createdAt: new Date(),
  //     updatedAt: new Date(),
  //     current: true,
  //     validation: {
  //       valid: true,
  //     },
  //   };
  //   axiosMock.onPost(`/revisions/${revisionId}/publish`).reply(({ data }) => {
  //     expect(JSON.parse(data).habilitationId).toEqual(
  //       habilitationId.toString(),
  //     );
  //     return [200, publishedRevision];
  //   });

  //   await syncOutdatedTask.run();

  //   const balResult = await balModel.findOne(balId);

  //   expect(balResult.status).toEqual(StatusBaseLocalEnum.PUBLISHED);
  //   expect(balResult.sync.currentUpdated.toISOString()).toEqual(
  //     _updated.toISOString(),
  //   );
  //   expect(balResult.sync.status).toEqual(StatusSyncEnum.SYNCED);
  //   expect(balResult.sync.isPaused).toEqual(false);
  //   expect(balResult.sync.lastUploadedRevisionId.toString()).toEqual(
  //     revisionId.toString(),
  //   );
  // });

  // it('syncOutdated same hash', async () => {
  //   const commune = '91534';
  //   const habilitationId = new Types.ObjectId();
  //   // REVSION
  //   const revisionId = new Types.ObjectId();
  //   const revision: Revision = {
  //     _id: revisionId.toString(),
  //     codeCommune: commune,
  //     status: StatusRevision.PENDING,
  //     ready: false,
  //     createdAt: new Date(),
  //     updatedAt: new Date(),
  //     current: false,
  //     validation: {
  //       valid: true,
  //     },
  //     files: [
  //       {
  //         type: 'bal',
  //         hash: '8d0cda05e7b8b58a92a18cd40d0549c1d3f8ac1ac9586243aa0e3f885bb870c4',
  //       },
  //     ],
  //   };

  //   // BAL
  //   const balId = await createBal({
  //     commune,
  //     _habilitation: habilitationId.toString(),
  //     status: StatusBaseLocalEnum.PUBLISHED,
  //     emails: ['test@test.fr'],
  //     sync: {
  //       status: StatusSyncEnum.OUTDATED,
  //       lastUploadedRevisionId: revisionId,
  //     },
  //   });
  //   const voieId = await createVoie({
  //     nom: 'rue de la paix',
  //     commune,
  //     _bal: balId,
  //   });
  //   await createNumero({
  //     _bal: balId,
  //     voie: voieId,
  //     numero: 1,
  //     suffixe: 'bis',
  //     positions: createPositions(),
  //     certifie: true,
  //     commune,
  //     _updated: new Date('2000-01-01'),
  //   });

  //   // MOCK AXIOS
  //   axiosMock
  //     .onGet(`/communes/${commune}/current-revision`)
  //     .reply(200, revision);

  //   const habilitation: Habilitation = {
  //     _id: habilitationId.toString(),
  //     status: StatusHabiliation.ACCEPTED,
  //     expiresAt: add(new Date(), { months: 1 }),
  //     codeCommune: commune,
  //     emailCommune: 'test@test.fr',
  //   };
  //   axiosMock.onGet(`habilitations/${habilitationId}`).reply(200, habilitation);

  //   await syncOutdatedTask.run();

  //   const balResult = await balModel.findOne(balId);

  //   expect(balResult.status).toEqual(StatusBaseLocalEnum.PUBLISHED);
  //   expect(balResult.sync.currentUpdated.toISOString()).toEqual(
  //     _updated.toISOString(),
  //   );
  //   expect(balResult.sync.status).toEqual(StatusSyncEnum.SYNCED);
  //   expect(balResult.sync.isPaused).toEqual(false);
  //   expect(balResult.sync.lastUploadedRevisionId.toString()).toEqual(
  //     revisionId.toString(),
  //   );
  // });

  // it('syncOutdated 412 no habilitation', async () => {
  //   const commune = '91534';
  //   // REVSION
  //   const revisionId = new Types.ObjectId();
  //   const revision: Revision = {
  //     _id: revisionId.toString(),
  //     codeCommune: commune,
  //     status: StatusRevision.PENDING,
  //     ready: false,
  //     createdAt: new Date(),
  //     updatedAt: new Date(),
  //     current: false,
  //     validation: {
  //       valid: true,
  //     },
  //     files: [
  //       {
  //         type: 'bal',
  //         hash: '',
  //       },
  //     ],
  //   };

  //   // BAL
  //   const balId = await createBal({
  //     commune,
  //     status: StatusBaseLocalEnum.PUBLISHED,
  //     emails: ['test@test.fr'],
  //     sync: {
  //       status: StatusSyncEnum.OUTDATED,
  //       lastUploadedRevisionId: revisionId,
  //     },
  //   });

  //   // MOCK AXIOS
  //   axiosMock
  //     .onGet(`/communes/${commune}/current-revision`)
  //     .reply(200, revision);

  //   await syncOutdatedTask.run();

  //   const resultBal = await balModel.findOne(balId);
  //   expect(resultBal.sync.status).toEqual(StatusSyncEnum.OUTDATED);
  //   expect(resultBal.sync.lastUploadedRevisionId).toEqual(revisionId);
  // });

  // it('syncOutdated 412 habilitation PENDING', async () => {
  //   const commune = '91534';
  //   // REVSION
  //   const revisionId = new Types.ObjectId();
  //   const revision: Revision = {
  //     _id: revisionId.toString(),
  //     codeCommune: commune,
  //     status: StatusRevision.PENDING,
  //     ready: false,
  //     createdAt: new Date(),
  //     updatedAt: new Date(),
  //     current: false,
  //     validation: {
  //       valid: true,
  //     },
  //     files: [
  //       {
  //         type: 'bal',
  //         hash: '',
  //       },
  //     ],
  //   };

  //   const habilitationId = new Types.ObjectId();
  //   // BAL
  //   const balId = await createBal({
  //     commune,
  //     _habilitation: habilitationId.toString(),
  //     status: StatusBaseLocalEnum.PUBLISHED,
  //     emails: ['test@test.fr'],
  //     sync: {
  //       status: StatusSyncEnum.OUTDATED,
  //       lastUploadedRevisionId: revisionId,
  //     },
  //   });

  //   // MOCK AXIOS
  //   axiosMock
  //     .onGet(`/communes/${commune}/current-revision`)
  //     .reply(200, revision);

  //   const habilitation: Habilitation = {
  //     _id: habilitationId.toString(),
  //     status: StatusHabiliation.PENDING,
  //     expiresAt: add(new Date(), { months: 1 }),
  //     codeCommune: commune,
  //     emailCommune: 'test@test.fr',
  //   };
  //   axiosMock.onGet(`habilitations/${habilitationId}`).reply(200, habilitation);

  //   await syncOutdatedTask.run();

  //   const resultBal = await balModel.findOne(balId);
  //   expect(resultBal.sync.status).toEqual(StatusSyncEnum.OUTDATED);
  //   expect(resultBal.sync.lastUploadedRevisionId).toEqual(revisionId);
  // });

  // it('syncOutdated 412 habilitation expired', async () => {
  //   const commune = '91534';
  //   // REVSION
  //   const revisionId = new Types.ObjectId();
  //   const revision: Revision = {
  //     _id: revisionId.toString(),
  //     codeCommune: commune,
  //     status: StatusRevision.PENDING,
  //     ready: false,
  //     createdAt: new Date(),
  //     updatedAt: new Date(),
  //     current: false,
  //     validation: {
  //       valid: true,
  //     },
  //     files: [
  //       {
  //         type: 'bal',
  //         hash: '',
  //       },
  //     ],
  //   };

  //   const habilitationId = new Types.ObjectId();
  //   // BAL
  //   const balId = await createBal({
  //     commune,
  //     _habilitation: habilitationId.toString(),
  //     status: StatusBaseLocalEnum.PUBLISHED,
  //     emails: ['test@test.fr'],
  //     sync: {
  //       status: StatusSyncEnum.OUTDATED,
  //       lastUploadedRevisionId: revisionId,
  //     },
  //   });

  //   // MOCK AXIOS
  //   axiosMock
  //     .onGet(`/communes/${commune}/current-revision`)
  //     .reply(200, revision);

  //   const habilitation: Habilitation = {
  //     _id: habilitationId.toString(),
  //     status: StatusHabiliation.ACCEPTED,
  //     expiresAt: sub(new Date(), { months: 1 }),
  //     codeCommune: commune,
  //     emailCommune: 'test@test.fr',
  //   };
  //   axiosMock.onGet(`habilitations/${habilitationId}`).reply(200, habilitation);

  //   await syncOutdatedTask.run();

  //   const resultBal = await balModel.findOne(balId);
  //   expect(resultBal.sync.status).toEqual(StatusSyncEnum.OUTDATED);
  //   expect(resultBal.sync.lastUploadedRevisionId).toEqual(revisionId);
  // });

  // it('syncOutdated 412 no numero', async () => {
  //   const commune = '91534';
  //   // REVSION
  //   const revisionId = new Types.ObjectId();
  //   const revision: Revision = {
  //     _id: revisionId.toString(),
  //     codeCommune: commune,
  //     status: StatusRevision.PENDING,
  //     ready: false,
  //     createdAt: new Date(),
  //     updatedAt: new Date(),
  //     current: false,
  //     validation: {
  //       valid: true,
  //     },
  //     files: [
  //       {
  //         type: 'bal',
  //         hash: '',
  //       },
  //     ],
  //   };

  //   const habilitationId = new Types.ObjectId();
  //   // BAL
  //   const balId = await createBal({
  //     commune,
  //     _habilitation: habilitationId.toString(),
  //     status: StatusBaseLocalEnum.PUBLISHED,
  //     emails: ['test@test.fr'],
  //     sync: {
  //       status: StatusSyncEnum.OUTDATED,
  //       lastUploadedRevisionId: revisionId,
  //     },
  //   });

  //   // MOCK AXIOS
  //   axiosMock
  //     .onGet(`/communes/${commune}/current-revision`)
  //     .reply(200, revision);

  //   const habilitation: Habilitation = {
  //     _id: habilitationId.toString(),
  //     status: StatusHabiliation.ACCEPTED,
  //     expiresAt: add(new Date(), { months: 1 }),
  //     codeCommune: commune,
  //     emailCommune: 'test@test.fr',
  //   };
  //   axiosMock.onGet(`habilitations/${habilitationId}`).reply(200, habilitation);

  //   await syncOutdatedTask.run();

  //   const resultBal = await balModel.findOne(balId);
  //   expect(resultBal.sync.status).toEqual(StatusSyncEnum.OUTDATED);
  //   expect(resultBal.sync.lastUploadedRevisionId).toEqual(revisionId);
  // });
});
