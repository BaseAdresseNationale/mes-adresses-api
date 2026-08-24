import { Test, TestingModule } from '@nestjs/testing';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { Client } from 'pg';
import {
  Global,
  INestApplication,
  Logger,
  Module,
  ValidationPipe,
} from '@nestjs/common';
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
import { Position } from '@/shared/entities/position.entity';

import { ApiDepotModule } from '@/shared/modules/api_depot/api_depot.module';
import { PublicationModule } from '@/shared/modules/publication/publication.module';
import { MailerService } from '@nestjs-modules/mailer';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CacheModule } from '@/shared/modules/cache/cache.module';
import { Cache } from '@/shared/entities/cache.entity';
import { ResetCommunesForWebinaireTask } from '../src/tasks/reset_communes_for_webinaire.task';

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
  let resetCommuneForWebinaireTask: ResetCommunesForWebinaireTask;
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
          entities: [BaseLocale, Voie, Numero, Toponyme, Position, Cache],
        }),
        TypeOrmModule.forFeature([BaseLocale]),
        ApiDepotModule,
        PublicationModule,
        MailerModule,
        CacheModule,
      ],
      providers: [ResetCommunesForWebinaireTask, Logger],
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
    resetCommuneForWebinaireTask = app.get<ResetCommunesForWebinaireTask>(
      ResetCommunesForWebinaireTask,
    );
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
    const entityToInsert = balRepository.create(payload);
    const result = await balRepository.save(entityToInsert);
    return result.id;
  }

  describe('ResetCommuneForWebinaireTask', () => {
    it('should do nothing if process.env.RESET_COMMUNES_FOR_WEBINAIRE is unset', async () => {
      process.env.RESET_COMMUNES_FOR_WEBINAIRE = '';

      await createBal({
        nom: 'bal',
        banId: '52c4de09-6b82-45eb-8ed7-b212607282f7',
        commune: '27115',
        status: StatusBaseLocalEnum.PUBLISHED,
        emails: ['test@test.fr'],
      });

      await createBal({
        nom: 'bal',
        banId: '52c4de09-6b82-45eb-8ed7-b212607282f7',
        commune: '27115',
        status: StatusBaseLocalEnum.DRAFT,
        emails: ['test@test.fr'],
      });

      await createBal({
        nom: 'bal',
        banId: '52c4de09-6b82-45eb-8ed7-b212607282f7',
        commune: '27115',
        status: StatusBaseLocalEnum.DEMO,
        emails: ['test@test.fr'],
      });

      await resetCommuneForWebinaireTask.run();

      const resultBal = await balRepository.find({
        where: { commune: '27115' },
      });
      expect(resultBal).toHaveLength(3);
    });

    it('should delete and soft delete bals from given communes', async () => {
      process.env.RESET_COMMUNES_FOR_WEBINAIRE = '27115,37131';

      const balPublished1 = await createBal({
        nom: 'bal',
        banId: '52c4de09-6b82-45eb-8ed7-b212607282f7',
        commune: '27115',
        status: StatusBaseLocalEnum.PUBLISHED,
        emails: ['test@test.fr'],
      });

      const balPublished2 = await createBal({
        nom: 'bal',
        banId: '52c4de09-6b82-45eb-8ed7-b212607282f7',
        commune: '37131',
        status: StatusBaseLocalEnum.PUBLISHED,
        emails: ['test@test.fr'],
      });

      const balPublished3 = await createBal({
        nom: 'bal',
        banId: '52c4de09-6b82-45eb-8ed7-b212607282f7',
        commune: '37003',
        status: StatusBaseLocalEnum.PUBLISHED,
        emails: ['test@test.fr'],
      });

      const balDraft = await createBal({
        nom: 'bal',
        banId: '52c4de09-6b82-45eb-8ed7-b212607282f7',
        commune: '27115',
        status: StatusBaseLocalEnum.DRAFT,
        emails: ['test@test.fr'],
      });

      const balDemo = await createBal({
        nom: 'bal',
        banId: '52c4de09-6b82-45eb-8ed7-b212607282f7',
        commune: '27115',
        status: StatusBaseLocalEnum.DEMO,
        emails: ['test@test.fr'],
      });

      await resetCommuneForWebinaireTask.run();

      const resultBalPublished1 = await balRepository.findOne({
        where: { id: balPublished1 },
        withDeleted: true,
      });
      expect(resultBalPublished1).toBeNull();

      const resultBalPublished2 = await balRepository.findOne({
        where: { id: balPublished2 },
        withDeleted: true,
      });
      expect(resultBalPublished2).toBeNull();

      const resultBalPublished3 = await balRepository.findOne({
        where: { id: balPublished3 },
        withDeleted: true,
      });
      expect(resultBalPublished3).toBeTruthy();

      const resultBalDraft = await balRepository.findOne({
        where: { id: balDraft },
        withDeleted: true,
      });
      expect(resultBalDraft).toBeNull();

      const resultBalDemo = await balRepository.findOneBy({ id: balDemo });
      expect(resultBalDemo).toBeNull();
    });
  });
});
