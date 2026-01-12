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
import { Signalement } from '@/shared/openapi-signalement';
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

const OpenAPISignalementServiceMock = {
  getSignalementById: jest.fn(() => Promise.resolve(signalement)),
  updateSignalement: jest.fn(() => Promise.resolve(signalement)),
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
        'Communes do not match for signalement xxxx',
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
});
