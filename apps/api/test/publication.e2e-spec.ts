import { Test, TestingModule } from '@nestjs/testing';
import {
  HttpException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { ObjectId } from 'mongodb';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';

import { Numero } from '@/shared/entities/numero.entity';
import { Voie } from '@/shared/entities/voie.entity';
import { Toponyme } from '@/shared/entities/toponyme.entity';
import {
  BaseLocale,
  StatusBaseLocalEnum,
  StatusSyncEnum,
} from '@/shared/entities/base_locale.entity';
import {
  Event,
  EventActionEnum,
  EventEntityTypeEnum,
} from '@/shared/entities/event.entity';
import {
  Revision,
  StatusRevisionEnum,
  TypeFileEnum,
  Habilitation,
  StatusHabilitationEnum,
} from '@/shared/modules/api_depot/api-depot.types';

// import { MailerModule } from '@/shared/test/mailer.module.test';
import { Repository } from 'typeorm';
import { PublicationModule } from '@/shared/modules/publication/publication.module';
import { PublicationService } from '@/shared/modules/publication/publication.service';
import {
  createBal,
  createNumero,
  createPositions,
  createVoie,
  deleteRepositories,
  getTypeORMModule,
  getTypeormRepository,
  initTypeormRepository,
  startPostgresContainer,
  stopPostgresContainer,
} from './typeorm.utils';

describe('PUBLICATION MODULE', () => {
  let app: INestApplication;
  // DB
  let repositories: {
    numeros: Repository<Numero>;
    voies: Repository<Voie>;
    bals: Repository<BaseLocale>;
    toponymes: Repository<Toponyme>;
  };
  // SERVICE
  let publicationService: PublicationService;
  // AXIOS
  const axiosMock = new MockAdapter(axios);

  // Mocks a full "OUTDATED, hash différent" publish flow (habilitation,
  // current-revision with an empty/never-matching hash so a new revision is
  // always published, revision creation/compute/publish) and captures the
  // CSV content actually uploaded, for tests that only care about the CSV
  // rollback logic rather than the api-depot flow itself.
  function mockOutdatedPublish({
    commune,
    habilitationId,
    revisionId,
  }: {
    commune: string;
    habilitationId: string;
    revisionId: string;
  }): { getUploadedCsv: () => string } {
    let uploadedCsv: string;

    const revision: Revision = {
      id: revisionId,
      codeCommune: commune,
      status: StatusRevisionEnum.PENDING,
      isReady: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      isCurrent: false,
      validation: { valid: true },
      files: [{ type: TypeFileEnum.BAL, hash: '' }],
    };
    axiosMock
      .onGet(`/communes/${commune}/current-revision`)
      .reply(200, revision);

    const habilitation: Habilitation = {
      id: habilitationId,
      status: StatusHabilitationEnum.ACCEPTED,
      codeCommune: commune,
      emailCommune: 'test@test.fr',
    };
    axiosMock.onGet(`habilitations/${habilitationId}`).reply(200, habilitation);

    axiosMock.onPost(`/communes/${commune}/revisions`).reply(200, revision);
    axiosMock.onPost(`/revisions/${revisionId}/compute`).reply(200, revision);

    axiosMock.onPut(`/revisions/${revisionId}/files/bal`).reply(({ data }) => {
      uploadedCsv = data;
      return [200, null];
    });

    axiosMock.onPost(`/revisions/${revisionId}/publish`).reply(200, {
      ...revision,
      status: StatusRevisionEnum.PUBLISHED,
      isReady: true,
      isCurrent: true,
    });

    return { getUploadedCsv: () => uploadedCsv };
  }

  // Builds a minimal fake Event (never persisted — `ignoredEvents` is only
  // ever passed as in-memory data down to PublicationService/ExportCsvService,
  // which never re-query it) for the given entity/action/payloads.
  function fakeEvent(overrides: Partial<Event>): Event {
    return {
      id: new ObjectId().toHexString(),
      balId: null,
      voieId: null,
      parentEventId: null,
      entityType: null,
      entityId: null,
      action: null,
      payloadBefore: null,
      payloadAfter: null,
      isSyncedWithRevision: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    } as Event;
  }

  beforeAll(async () => {
    // INIT DB
    await startPostgresContainer();
    // INIT MODULE
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [getTypeORMModule(), PublicationModule],
    }).compile();
    publicationService = await moduleFixture.resolve(PublicationService);

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
    // INIT REPOSITORY
    initTypeormRepository(app);
    repositories = getTypeormRepository();
  });

  afterAll(async () => {
    await stopPostgresContainer();
    await app.close();
  });

  afterEach(async () => {
    axiosMock.reset();
    await deleteRepositories();
  });

  describe('POST /bases-locales/sync/exec', () => {
    it('Publish 200 DRAFT', async () => {
      const commune = '08053';
      const habilitationId = new ObjectId().toHexString();
      const balId = await createBal({
        nom: 'bal',
        commune,
        habilitationId: habilitationId,
        status: StatusBaseLocalEnum.DRAFT,
        emails: ['test@test.fr'],
      });
      const { banId: communeUuid } = await repositories.bals.findOneBy({
        id: balId,
      });
      const voieId = await createVoie(balId, {
        nom: 'rue de la paix',
      });
      const { banId: voieUuid } = await repositories.voies.findOneBy({
        id: voieId,
      });
      const numeroId = await createNumero(balId, voieId, {
        numero: 1,
        suffixe: 'bis',
        positions: [createPositions()],
        certifie: true,
        updatedAt: new Date('2000-01-01'),
        communeDeleguee: '08294',
      });
      const { banId: numeroUuid } = await repositories.numeros.findOneBy({
        id: numeroId,
      });
      // MOCK AXIOS
      const habilitation: Habilitation = {
        id: habilitationId,
        status: StatusHabilitationEnum.ACCEPTED,
        codeCommune: commune,
        emailCommune: 'test@test.fr',
      };
      axiosMock
        .onGet(`habilitations/${habilitationId}`)
        .reply(200, habilitation);

      const revisionId = new ObjectId().toHexString();
      const revision: Revision = {
        id: revisionId,
        codeCommune: commune,
        status: StatusRevisionEnum.PENDING,
        isReady: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        isCurrent: false,
        validation: {
          valid: true,
        },
      };
      axiosMock.onPost(`/communes/${commune}/revisions`).reply(200, revision);

      axiosMock.onPost(`/revisions/${revisionId}/compute`).reply(200, revision);

      const csvFile = `cle_interop;id_ban_commune;id_ban_toponyme;id_ban_adresse;toponyme;lieudit_complement_nom;numero;suffixe;certification_commune;commune_insee;commune_nom;commune_deleguee_insee;commune_deleguee_nom;position;long;lat;x;y;cad_parcelles;source;date_der_maj
        08053_xxxx_00001_bis;${communeUuid};${voieUuid};${numeroUuid};rue de la paix;;1;bis;1;08053;Bazeilles;08294;La Moncelle;entrée;8;42;1114835.92;6113076.85;;ban;2000-01-01`;
      axiosMock
        .onPut(`/revisions/${revisionId}/files/bal`)
        .reply(({ data }) => {
          expect(data.replace(/\s/g, '')).toEqual(csvFile.replace(/\s/g, ''));
          return [200, null];
        });

      const publishedRevision: Revision = {
        id: revisionId,
        codeCommune: commune,
        status: StatusRevisionEnum.PUBLISHED,
        isReady: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        isCurrent: true,
        validation: {
          valid: true,
        },
      };
      axiosMock.onPost(`/revisions/${revisionId}/publish`).reply(({ data }) => {
        expect(JSON.parse(data).habilitationId).toEqual(habilitationId);
        return [200, publishedRevision];
      });

      const { baseLocale: res } = await publicationService.exec(balId, {
        force: true,
      });
      const syncExpected = {
        status: StatusSyncEnum.SYNCED,
        isPaused: false,
        lastUploadedRevisionId: revisionId,
      };

      expect(res.id).toEqual(balId);
      expect(res.commune).toEqual(commune);
      expect(res.status).toEqual(StatusBaseLocalEnum.PUBLISHED);
      expect(res.sync).toMatchObject(syncExpected);
      expect(res.sync.currentUpdated).toBeDefined();
    });

    it('Publish 200 OUTDATED', async () => {
      const commune = '91534';
      const habilitationId = new ObjectId().toHexString();
      // REVSION
      const revisionId = new ObjectId().toHexString();
      const revision: Revision = {
        id: revisionId,
        codeCommune: commune,
        status: StatusRevisionEnum.PENDING,
        isReady: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        isCurrent: false,
        validation: {
          valid: true,
        },
        files: [
          {
            type: TypeFileEnum.BAL,
            hash: '',
          },
        ],
      };

      // BAL
      const balId = await createBal({
        nom: 'bal',
        commune,
        habilitationId,
        status: StatusBaseLocalEnum.PUBLISHED,
        emails: ['test@test.fr'],
        sync: {
          status: StatusSyncEnum.OUTDATED,
          lastUploadedRevisionId: revisionId,
        },
      });
      const { banId: communeUuid } = await repositories.bals.findOneBy({
        id: balId,
      });
      const voieId = await createVoie(balId, {
        nom: 'rue de la paix',
      });
      const { banId: toponymeUuid } = await repositories.voies.findOneBy({
        id: voieId,
      });
      const numeroId = await createNumero(balId, voieId, {
        numero: 1,
        suffixe: 'bis',
        positions: [createPositions()],
        certifie: true,
        updatedAt: new Date('2000-01-01'),
      });
      const { banId: numeroUuid } = await repositories.numeros.findOneBy({
        id: numeroId,
      });

      // MOCK AXIOS
      axiosMock
        .onGet(`/communes/${commune}/current-revision`)
        .reply(200, revision);

      const habilitation: Habilitation = {
        id: habilitationId,
        status: StatusHabilitationEnum.ACCEPTED,
        codeCommune: commune,
        emailCommune: 'test@test.fr',
      };
      axiosMock
        .onGet(`habilitations/${habilitationId}`)
        .reply(200, habilitation);

      axiosMock.onPost(`/communes/${commune}/revisions`).reply(200, revision);

      axiosMock.onPost(`/revisions/${revisionId}/compute`).reply(200, revision);

      const csvFile = `cle_interop;id_ban_commune;id_ban_toponyme;id_ban_adresse;toponyme;lieudit_complement_nom;numero;suffixe;certification_commune;commune_insee;commune_nom;commune_deleguee_insee;commune_deleguee_nom;position;long;lat;x;y;cad_parcelles;source;date_der_maj
        91534_xxxx_00001_bis;${communeUuid};${toponymeUuid};${numeroUuid};rue de la paix;;1;bis;1;91534;Saclay;;;entrée;8;42;1114835.92;6113076.85;;ban;2000-01-01`;
      axiosMock
        .onPut(`/revisions/${revisionId}/files/bal`)
        .reply(({ data }) => {
          expect(data.replace(/\s/g, '')).toEqual(csvFile.replace(/\s/g, ''));
          return [200, null];
        });

      const publishedRevision: Revision = {
        id: revisionId,
        codeCommune: commune,
        status: StatusRevisionEnum.PUBLISHED,
        isReady: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        isCurrent: true,
        validation: {
          valid: true,
        },
      };
      axiosMock.onPost(`/revisions/${revisionId}/publish`).reply(({ data }) => {
        expect(JSON.parse(data).habilitationId).toEqual(habilitationId);
        return [200, publishedRevision];
      });

      const { baseLocale: res } = await publicationService.exec(balId, {
        force: true,
      });

      const syncExpected = {
        status: StatusSyncEnum.SYNCED,
        isPaused: false,
        lastUploadedRevisionId: revisionId,
      };

      expect(res.id).toEqual(balId);
      expect(res.commune).toEqual(commune);
      expect(res.status).toEqual(StatusBaseLocalEnum.PUBLISHED);
      expect(res.sync).toMatchObject(syncExpected);
      expect(res.sync.currentUpdated).toBeDefined();
    });

    it('Publish 200 OUTDATED same hash', async () => {
      const commune = '91534';
      const habilitationId = new ObjectId().toHexString();
      // REVSION
      const revisionId = new ObjectId().toHexString();
      const revision: Revision = {
        id: revisionId,
        codeCommune: commune,
        status: StatusRevisionEnum.PENDING,
        isReady: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        isCurrent: false,
        validation: {
          valid: true,
        },
        files: [
          {
            type: TypeFileEnum.BAL,
            hash: '2d254c7514e156510f2bee359c9a32c802f909e886f54ebfba6ed6ab2e1ff579',
          },
        ],
      };

      // BAL
      const balId = await createBal({
        nom: 'bal',
        commune,
        habilitationId,
        banId: '52c4de09-6b82-45eb-8ed7-b212607282f7',
        status: StatusBaseLocalEnum.PUBLISHED,
        emails: ['test@test.fr'],
        sync: {
          status: StatusSyncEnum.OUTDATED,
          lastUploadedRevisionId: revisionId,
        },
      });
      const voieId = await createVoie(balId, {
        nom: 'rue de la paix',
        banId: '26734c2d-2a14-4eeb-ac5b-1be055c0a5ae',
      });
      await createNumero(balId, voieId, {
        numero: 1,
        suffixe: 'bis',
        banId: '2da3bb47-1a10-495a-8c29-6b8d0e79f9af',
        positions: [createPositions()],
        certifie: true,
        updatedAt: new Date('2000-01-01'),
      });

      // MOCK AXIOS
      axiosMock
        .onGet(`/communes/${commune}/current-revision`)
        .reply(200, revision);

      const habilitation: Habilitation = {
        id: habilitationId,
        status: StatusHabilitationEnum.ACCEPTED,
        codeCommune: commune,
        emailCommune: 'test@test.fr',
      };
      axiosMock
        .onGet(`habilitations/${habilitationId}`)
        .reply(200, habilitation);

      const { baseLocale: res } = await publicationService.exec(balId, {
        force: true,
      });

      const syncExpected = {
        status: StatusSyncEnum.SYNCED,
        isPaused: false,
        lastUploadedRevisionId: revisionId,
      };

      expect(res.id).toEqual(balId);
      expect(res.commune).toEqual(commune);
      expect(res.status).toEqual(StatusBaseLocalEnum.PUBLISHED);
      expect(res.sync).toMatchObject(syncExpected);
      expect(res.sync.currentUpdated).toBeDefined();
    });

    it('Publish 412 status DEMO', async () => {
      const commune = '91534';
      const habilitationId = new ObjectId().toHexString();
      const balId = await createBal({
        nom: 'bal',
        commune,
        habilitationId,
        status: StatusBaseLocalEnum.DEMO,
        emails: ['test@test.fr'],
      });

      await expect(
        publicationService.exec(balId, { force: true }),
      ).rejects.toThrow(HttpException);
    });

    it('Publish 412 no habilitation', async () => {
      const commune = '91534';
      const balId = await createBal({
        nom: 'bal',
        commune,
        status: StatusBaseLocalEnum.DRAFT,
        emails: ['test@test.fr'],
      });

      await expect(
        publicationService.exec(balId, { force: true }),
      ).rejects.toThrow(HttpException);
    });

    it('Publish 412 habilitation PENDING', async () => {
      const commune = '91534';
      const habilitationId = new ObjectId().toHexString();
      const balId = await createBal({
        nom: 'bal',
        commune,
        habilitationId,
        status: StatusBaseLocalEnum.DRAFT,
        emails: ['test@test.fr'],
      });

      // MOCK AXIOS
      const habilitation: Habilitation = {
        id: habilitationId,
        status: StatusHabilitationEnum.PENDING,
        codeCommune: commune,
        emailCommune: 'test@test.fr',
      };
      axiosMock
        .onGet(`habilitations/${habilitationId}`)
        .reply(200, habilitation);

      await expect(
        publicationService.exec(balId, { force: true }),
      ).rejects.toThrow(HttpException);
    });

    it('Publish 412 no numero', async () => {
      const commune = '91534';
      const habilitationId = new ObjectId().toHexString();
      const balId = await createBal({
        nom: 'bal',
        commune,
        habilitationId,
        status: StatusBaseLocalEnum.DRAFT,
        emails: ['test@test.fr'],
      });

      // MOCK AXIOS
      const habilitation: Habilitation = {
        id: habilitationId,
        status: StatusHabilitationEnum.ACCEPTED,
        codeCommune: commune,
        emailCommune: 'test@test.fr',
      };
      axiosMock
        .onGet(`habilitations/${habilitationId}`)
        .reply(200, habilitation);

      await expect(
        publicationService.exec(balId, { force: true }),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('POST /bases-locales/sync/exec — ignoreEvents rollback', () => {
    it('ignoring a NUMERO UPDATE event rolls its row back to payloadBefore in the CSV', async () => {
      const commune = '91534';
      const habilitationId = new ObjectId().toHexString();
      const revisionId = new ObjectId().toHexString();

      const balId = await createBal({
        nom: 'bal',
        commune,
        habilitationId,
        status: StatusBaseLocalEnum.PUBLISHED,
        emails: ['test@test.fr'],
        sync: {
          status: StatusSyncEnum.OUTDATED,
          lastUploadedRevisionId: revisionId,
        },
      });
      const voieId = await createVoie(balId, { nom: 'rue de la paix' });
      const numeroId = await createNumero(balId, voieId, {
        numero: 2,
        positions: [createPositions()],
        certifie: true,
      });
      const numero = await repositories.numeros.findOneBy({ id: numeroId });

      const ignoredEvent = fakeEvent({
        balId,
        voieId,
        entityType: EventEntityTypeEnum.NUMERO,
        entityId: numeroId,
        action: EventActionEnum.UPDATE,
        payloadBefore: {
          id: numeroId,
          banId: numero.banId,
          createdAt: numero.createdAt.toISOString(),
          balId,
          voieId,
          numero: 1,
          suffixe: null,
          comment: null,
          parcelles: null,
          certifie: true,
          communeDeleguee: null,
        },
        payloadAfter: {
          id: numeroId,
          banId: numero.banId,
          createdAt: numero.createdAt.toISOString(),
          balId,
          voieId,
          numero: 2,
          suffixe: null,
          comment: null,
          parcelles: null,
          certifie: true,
          communeDeleguee: null,
        },
      });

      const { getUploadedCsv } = mockOutdatedPublish({
        commune,
        habilitationId,
        revisionId,
      });

      await publicationService.exec(balId, {
        force: true,
        ignoredEvents: [ignoredEvent],
      });

      const csv = getUploadedCsv();
      expect(csv).toContain('91534_xxxx_00001;');
      expect(csv).not.toContain('91534_xxxx_00002;');
    });

    it('ignoring a NUMERO DELETE event reconstructs its row (and position) despite the real deletion', async () => {
      const commune = '91534';
      const habilitationId = new ObjectId().toHexString();
      const revisionId = new ObjectId().toHexString();

      const balId = await createBal({
        nom: 'bal',
        commune,
        habilitationId,
        status: StatusBaseLocalEnum.PUBLISHED,
        emails: ['test@test.fr'],
        sync: {
          status: StatusSyncEnum.OUTDATED,
          lastUploadedRevisionId: revisionId,
        },
      });
      const voieId = await createVoie(balId, { nom: 'rue de la paix' });
      // Un second numero est nécessaire : PublicationService refuse de
      // publier une BAL qui n'a plus aucun numero.
      await createNumero(balId, voieId, {
        numero: 2,
        positions: [createPositions([9, 43])],
        certifie: true,
      });
      const deletedNumeroId = await createNumero(balId, voieId, {
        numero: 1,
        positions: [createPositions([8, 42])],
        certifie: true,
      });
      const deletedNumero = await repositories.numeros.findOneBy({
        id: deletedNumeroId,
      });
      const [deletedPosition] = deletedNumero.positions;
      await repositories.numeros.delete({ id: deletedNumeroId });

      const numeroDeleteEvent = fakeEvent({
        balId,
        voieId,
        entityType: EventEntityTypeEnum.NUMERO,
        entityId: deletedNumeroId,
        action: EventActionEnum.DELETE,
        payloadBefore: {
          id: deletedNumeroId,
          banId: deletedNumero.banId,
          createdAt: deletedNumero.createdAt.toISOString(),
          balId,
          voieId,
          numero: 1,
          suffixe: null,
          comment: null,
          parcelles: null,
          certifie: true,
          communeDeleguee: null,
        },
        payloadAfter: null,
      });
      const positionDeleteEvent = fakeEvent({
        balId,
        voieId,
        entityType: EventEntityTypeEnum.POSITION,
        entityId: deletedPosition.id,
        action: EventActionEnum.DELETE,
        payloadBefore: {
          id: deletedPosition.id,
          toponymeId: null,
          numeroId: deletedNumeroId,
          type: deletedPosition.type,
          source: deletedPosition.source ?? null,
          rank: 0,
          point: deletedPosition.point,
        },
        payloadAfter: null,
      });

      const { getUploadedCsv } = mockOutdatedPublish({
        commune,
        habilitationId,
        revisionId,
      });

      await publicationService.exec(balId, {
        force: true,
        ignoredEvents: [numeroDeleteEvent, positionDeleteEvent],
      });

      const csv = getUploadedCsv();
      expect(csv).toContain('91534_xxxx_00001;');
      expect(csv).toContain('91534_xxxx_00002;');
    });

    it('ignoring a VOIE CREATE event (and its numero/position descendants) excludes them from the CSV', async () => {
      const commune = '91534';
      const habilitationId = new ObjectId().toHexString();
      const revisionId = new ObjectId().toHexString();

      const balId = await createBal({
        nom: 'bal',
        commune,
        habilitationId,
        status: StatusBaseLocalEnum.PUBLISHED,
        emails: ['test@test.fr'],
        sync: {
          status: StatusSyncEnum.OUTDATED,
          lastUploadedRevisionId: revisionId,
        },
      });
      const publishedVoieId = await createVoie(balId, { nom: 'rue publiée' });
      await createNumero(balId, publishedVoieId, {
        numero: 1,
        positions: [createPositions([8, 42])],
        certifie: true,
      });

      const newVoieId = await createVoie(balId, { nom: 'rue toute neuve' });
      const newVoie = await repositories.voies.findOneBy({ id: newVoieId });
      const newNumeroId = await createNumero(balId, newVoieId, {
        numero: 2,
        positions: [createPositions([9, 43])],
        certifie: true,
      });
      const newNumero = await repositories.numeros.findOneBy({
        id: newNumeroId,
      });
      const [newPosition] = newNumero.positions;

      const voieCreateEvent = fakeEvent({
        balId,
        voieId: newVoieId,
        entityType: EventEntityTypeEnum.VOIE,
        entityId: newVoieId,
        action: EventActionEnum.CREATE,
        payloadBefore: null,
        payloadAfter: {
          id: newVoieId,
          banId: newVoie.banId,
          createdAt: newVoie.createdAt.toISOString(),
          balId,
          nom: 'rue toute neuve',
          nomAlt: null,
          typeNumerotation: newVoie.typeNumerotation,
          centroid: null,
          trace: null,
          bbox: null,
          codeVoie: null,
          comment: null,
        },
      });
      const numeroCreateEvent = fakeEvent({
        balId,
        voieId: newVoieId,
        entityType: EventEntityTypeEnum.NUMERO,
        entityId: newNumeroId,
        action: EventActionEnum.CREATE,
        payloadBefore: null,
        payloadAfter: {
          id: newNumeroId,
          banId: newNumero.banId,
          createdAt: newNumero.createdAt.toISOString(),
          balId,
          voieId: newVoieId,
          numero: 2,
          suffixe: null,
          comment: null,
          parcelles: null,
          certifie: true,
          communeDeleguee: null,
        },
      });
      const positionCreateEvent = fakeEvent({
        balId,
        voieId: newVoieId,
        entityType: EventEntityTypeEnum.POSITION,
        entityId: newPosition.id,
        action: EventActionEnum.CREATE,
        payloadBefore: null,
        payloadAfter: {
          id: newPosition.id,
          toponymeId: null,
          numeroId: newNumeroId,
          type: newPosition.type,
          source: newPosition.source ?? null,
          rank: 0,
          point: newPosition.point,
        },
      });

      const { getUploadedCsv } = mockOutdatedPublish({
        commune,
        habilitationId,
        revisionId,
      });

      await publicationService.exec(balId, {
        force: true,
        ignoredEvents: [
          voieCreateEvent,
          numeroCreateEvent,
          positionCreateEvent,
        ],
      });

      const csv = getUploadedCsv();
      expect(csv).toContain('91534_xxxx_00001;');
      expect(csv).not.toContain('91534_xxxx_00002;');
      expect(csv).not.toContain('rue toute neuve');
    });
  });
});
