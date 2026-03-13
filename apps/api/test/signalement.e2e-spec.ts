import { Test, TestingModule } from '@nestjs/testing';
import {
  forwardRef,
  INestApplication,
  MiddlewareConsumer,
  Module,
  ValidationPipe,
} from '@nestjs/common';
import * as request from 'supertest';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { v4 as uuid } from 'uuid';

import { Numero } from '@/shared/entities/numero.entity';
import { Voie } from '@/shared/entities/voie.entity';
import { Toponyme } from '@/shared/entities/toponyme.entity';
import {
  BaseLocale,
  StatusBaseLocalEnum,
} from '@/shared/entities/base_locale.entity';

import { BaseLocaleModule } from '@/modules/base_locale/base_locale.module';
import { Repository } from 'typeorm';
import { Report, Signalement } from '@/shared/openapi-signalement';
import { MailerModule } from '@/shared/test/mailer.module.test';
import { SignalementService } from '@/modules/signalement/signalement.service';
import { OpenAPISignalementService } from '@/modules/signalement/openAPI-signalement.service';
import { SignalementController } from '@/modules/signalement/signalement.controller';
import { BaseLocaleMiddleware } from '@/modules/base_locale/base_locale.middleware';
import {
  token,
  updatedAt,
  createdAt,
  deleteRepositories,
  getTypeORMModule,
  getTypeormRepository,
  initTypeormRepository,
  startPostgresContainer,
  stopPostgresContainer,
} from './typeorm.utils';

const signalement = {
  createdAt: '2024-11-28T16:41:54.271Z',
  updatedAt: '2024-12-05T08:40:24.625Z',
  deletedAt: null,
  id: '4ecd95ca-cd6d-48ae-9b24-0b4580cd4ad8',
  codeCommune: '37003',
  type: 'LOCATION_TO_UPDATE',
  reportKind: Report.reportKind.SIGNALEMENT,
  existingLocation: {
    nom: 'Place de la Gare',
    type: 'TOPONYME',
    banId: null,
    position: {
      point: {
        type: 'Point',
        coordinates: [null, null],
      },
    },
    parcelles: [],
  },
  changesRequested: {
    nom: 'Place des gares',
    comment: '',
    parcelles: [],
    positions: [
      {
        type: 'segment',
        point: {
          type: 'Point',
          coordinates: [0.980669, 47.421277],
        },
      },
    ],
  },
  status: 'PENDING',
  source: {
    createdAt: '2024-11-21T13:13:29.575Z',
    updatedAt: '2024-11-21T13:13:29.575Z',
    deletedAt: null,
    id: '93978e92-c686-4093-be1a-0caaad53b445',
    nom: 'SIG Ville',
    type: 'PRIVATE',
  },
};

const alert = {
  createdAt: '2024-11-28T16:41:54.271Z',
  updatedAt: '2024-12-05T08:40:24.625Z',
  deletedAt: null,
  id: 'b1234567-cd6d-48ae-9b24-0b4580cd4ad8',
  codeCommune: '37003',
  type: 'MISSING_ADDRESS',
  reportKind: Report.reportKind.ALERT,
  status: 'PENDING',
  comment: 'Adresse manquante rue de la Paix',
  point: {
    type: 'Point',
    coordinates: [0.980669, 47.421277],
  },
  source: {
    createdAt: '2024-11-21T13:13:29.575Z',
    updatedAt: '2024-11-21T13:13:29.575Z',
    deletedAt: null,
    id: '93978e92-c686-4093-be1a-0caaad53b445',
    nom: 'SIG Ville',
    type: 'PRIVATE',
  },
};

const OpenAPISignalementServiceMock = {
  getSignalementById: jest.fn(() => Promise.resolve(signalement)),
  updateSignalement: jest.fn(() => Promise.resolve(signalement)),
  getAlertById: jest.fn(() => Promise.resolve(alert)),
  updateAlert: jest.fn(() => Promise.resolve(alert)),
};

@Module({
  imports: [forwardRef(() => BaseLocaleModule)],
  providers: [
    SignalementService,
    {
      provide: OpenAPISignalementService,
      useValue: OpenAPISignalementServiceMock,
    },
  ],
  controllers: [SignalementController],
  exports: [SignalementService],
})
class SignalementModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(BaseLocaleMiddleware).forRoutes(SignalementController);
  }
}

describe('SIGNALEMENT MODULE', () => {
  let app: INestApplication;
  // DB
  let repositories: {
    numeros: Repository<Numero>;
    voies: Repository<Voie>;
    bals: Repository<BaseLocale>;
    toponymes: Repository<Toponyme>;
  };
  // AXIOS
  const axiosMock = new MockAdapter(axios);

  beforeAll(async () => {
    // INIT DB
    await startPostgresContainer();
    // INIT MODULE
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        getTypeORMModule(),
        BaseLocaleModule,
        MailerModule,
        SignalementModule,
      ],
    }).compile();

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

  async function createBal(props: Partial<BaseLocale> = {}) {
    const payload: Partial<BaseLocale> = {
      banId: uuid(),
      createdAt,
      updatedAt,
      status: props.status ?? StatusBaseLocalEnum.DRAFT,
      token,
      ...props,
    };
    const entityToInsert = repositories.bals.create(payload);
    const result = await repositories.bals.save(entityToInsert);
    return result.id;
  }

  describe('PUT /signalements/:baseLocaleId', () => {
    it('should not update signalement if BAL is not published', async () => {
      const balId = await createBal({ nom: 'bal', commune: '91400' });

      const payload = {
        ids: ['xxxx'],
        status: Signalement.status.PROCESSED,
      };

      const response = await request(app.getHttpServer())
        .put(`/signalements/${balId}`)
        .send(payload)
        .set('authorization', `Bearer ${token}`)
        .expect(412);

      expect(response.body.message).toBe('BaseLocale is not published');
    });

    it('should not update signalement if communes do not match', async () => {
      const balId = await createBal({
        nom: 'bal',
        commune: '91400',
        status: StatusBaseLocalEnum.PUBLISHED,
      });

      const payload = {
        ids: ['xxxx'],
        status: Signalement.status.PROCESSED,
      };

      const response = await request(app.getHttpServer())
        .put(`/signalements/${balId}`)
        .send(payload)
        .set('authorization', `Bearer ${token}`)
        .expect(412);

      expect(response.body.message).toBe(
        'Communes do not match for report xxxx',
      );
    });

    it('should update signalement list', async () => {
      const balId = await createBal({
        nom: 'bal',
        commune: '37003',
        status: StatusBaseLocalEnum.PUBLISHED,
      });

      const payload = {
        ids: ['xxxx', 'yyyy'],
        status: Signalement.status.PROCESSED,
      };

      await request(app.getHttpServer())
        .put(`/signalements/${balId}`)
        .send(payload)
        .set('authorization', `Bearer ${token}`)
        .expect(200);
    });
  });

  describe('GET /signalements/:baseLocaleId/:idSignalement', () => {
    it('should get a signalement by id', async () => {
      const balId = await createBal({
        nom: 'bal',
        commune: '37003',
        status: StatusBaseLocalEnum.PUBLISHED,
      });

      const response = await request(app.getHttpServer())
        .get(`/signalements/${balId}/${signalement.id}`)
        .set('authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.id).toBe(signalement.id);
      expect(response.body.type).toBe('LOCATION_TO_UPDATE');
      expect(response.body.reportKind).toBe(Report.reportKind.SIGNALEMENT);
    });

    it('should get an alert by id when signalement not found', async () => {
      OpenAPISignalementServiceMock.getSignalementById.mockRejectedValueOnce(
        new Error('Not found'),
      );

      const balId = await createBal({
        nom: 'bal',
        commune: '37003',
        status: StatusBaseLocalEnum.PUBLISHED,
      });

      const response = await request(app.getHttpServer())
        .get(`/signalements/${balId}/${alert.id}`)
        .set('authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.id).toBe(alert.id);
      expect(response.body.type).toBe('MISSING_ADDRESS');
      expect(response.body.reportKind).toBe(Report.reportKind.ALERT);
    });

    it('should return 404 if report not found', async () => {
      OpenAPISignalementServiceMock.getSignalementById.mockRejectedValueOnce(
        new Error('Not found'),
      );
      OpenAPISignalementServiceMock.getAlertById.mockRejectedValueOnce(
        new Error('Not found'),
      );

      const balId = await createBal({
        nom: 'bal',
        commune: '37003',
        status: StatusBaseLocalEnum.PUBLISHED,
      });

      const response = await request(app.getHttpServer())
        .get(`/signalements/${balId}/unknown-id`)
        .set('authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.message).toBe('Report unknown-id not found');
    });
  });

  describe('PUT /signalements/:baseLocaleId/:reportId', () => {
    it('should not update report if BAL is not published', async () => {
      const balId = await createBal({ nom: 'bal', commune: '91400' });

      const payload = {
        status: Report.status.PROCESSED,
      };

      const response = await request(app.getHttpServer())
        .put(`/signalements/${balId}/${signalement.id}`)
        .send(payload)
        .set('authorization', `Bearer ${token}`)
        .expect(412);

      expect(response.body.message).toBe('BaseLocale is not published');
    });

    it('should not update report if communes do not match', async () => {
      const balId = await createBal({
        nom: 'bal',
        commune: '91400',
        status: StatusBaseLocalEnum.PUBLISHED,
      });

      const payload = {
        status: Report.status.PROCESSED,
      };

      const response = await request(app.getHttpServer())
        .put(`/signalements/${balId}/${signalement.id}`)
        .send(payload)
        .set('authorization', `Bearer ${token}`)
        .expect(412);

      expect(response.body.message).toBe(
        `Communes do not match for report ${signalement.id}`,
      );
    });

    it('should update one signalement', async () => {
      const balId = await createBal({
        nom: 'bal',
        commune: '37003',
        status: StatusBaseLocalEnum.PUBLISHED,
      });

      const payload = {
        status: Report.status.PROCESSED,
      };

      await request(app.getHttpServer())
        .put(`/signalements/${balId}/${signalement.id}`)
        .send(payload)
        .set('authorization', `Bearer ${token}`)
        .expect(200);

      expect(
        OpenAPISignalementServiceMock.updateSignalement,
      ).toHaveBeenCalledWith(signalement.id, {
        status: Report.status.PROCESSED,
      });
    });

    it('should update one alert', async () => {
      OpenAPISignalementServiceMock.getSignalementById.mockRejectedValueOnce(
        new Error('Not found'),
      );

      const balId = await createBal({
        nom: 'bal',
        commune: '37003',
        status: StatusBaseLocalEnum.PUBLISHED,
      });

      const payload = {
        status: Report.status.IGNORED,
        rejectionReason: 'Non pertinent',
      };

      await request(app.getHttpServer())
        .put(`/signalements/${balId}/${alert.id}`)
        .send(payload)
        .set('authorization', `Bearer ${token}`)
        .expect(200);

      expect(OpenAPISignalementServiceMock.updateAlert).toHaveBeenCalledWith(
        alert.id,
        {
          status: Report.status.IGNORED,
          rejectionReason: 'Non pertinent',
        },
      );
    });

    it('should update one alert with context', async () => {
      OpenAPISignalementServiceMock.getSignalementById.mockRejectedValueOnce(
        new Error('Not found'),
      );

      const balId = await createBal({
        nom: 'bal',
        commune: '37003',
        status: StatusBaseLocalEnum.PUBLISHED,
      });

      const payload = {
        status: Report.status.PROCESSED,
        context: {
          idRNB: 'RNB-123',
          createdAddress: {
            idBAN: 'ban-456',
            label: '12 rue de la Paix 37003',
          },
        },
      };

      await request(app.getHttpServer())
        .put(`/signalements/${balId}/${alert.id}`)
        .send(payload)
        .set('authorization', `Bearer ${token}`)
        .expect(200);

      expect(OpenAPISignalementServiceMock.updateAlert).toHaveBeenCalledWith(
        alert.id,
        {
          status: Report.status.PROCESSED,
          context: {
            idRNB: 'RNB-123',
            createdAddress: {
              idBAN: 'ban-456',
              label: '12 rue de la Paix 37003',
            },
          },
        },
      );
    });

    it('should return 404 if report not found', async () => {
      OpenAPISignalementServiceMock.getSignalementById.mockRejectedValueOnce(
        new Error('Not found'),
      );
      OpenAPISignalementServiceMock.getAlertById.mockRejectedValueOnce(
        new Error('Not found'),
      );

      const balId = await createBal({
        nom: 'bal',
        commune: '37003',
        status: StatusBaseLocalEnum.PUBLISHED,
      });

      const payload = {
        status: Report.status.PROCESSED,
      };

      const response = await request(app.getHttpServer())
        .put(`/signalements/${balId}/unknown-id`)
        .send(payload)
        .set('authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.message).toBe('Report unknown-id not found');
    });
  });
});
