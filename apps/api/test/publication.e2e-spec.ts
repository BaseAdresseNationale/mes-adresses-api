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

      const csvFile = `cle_interop;id_ban_commune;id_ban_toponyme;id_ban_adresse;voie_nom;lieudit_complement_nom;numero;suffixe;certification_commune;commune_insee;commune_nom;commune_deleguee_insee;commune_deleguee_nom;position;long;lat;x;y;cad_parcelles;source;date_der_maj
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

      const res = await publicationService.exec(balId, { force: true });
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

      const csvFile = `cle_interop;id_ban_commune;id_ban_toponyme;id_ban_adresse;voie_nom;lieudit_complement_nom;numero;suffixe;certification_commune;commune_insee;commune_nom;commune_deleguee_insee;commune_deleguee_nom;position;long;lat;x;y;cad_parcelles;source;date_der_maj
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

      const res = await publicationService.exec(balId, { force: true });

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
            hash: '37925d84890a965635aa5f119efade4fb2dc02331039a80c57497a9bb21ea82b',
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

      const res = await publicationService.exec(balId, { force: true });

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
});
