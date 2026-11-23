import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { pointToTile } from '@mapbox/tilebelt';
import { Repository } from 'typeorm';

import { BaseLocale } from '@/shared/entities/base_locale.entity';
import { BaseLocaleModule } from '@/modules/base_locale/base_locale.module';
import { MailerModule } from '@/shared/test/mailer.module.test';
import {
  token,
  updatedAt,
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

describe('TILES MODULE', () => {
  let app: INestApplication;
  let repositories: {
    bals: Repository<BaseLocale>;
  };

  // Tuile de zoom 19 contenant le point par défaut de createPositions
  const [x, y, z] = pointToTile(8, 42, 19);

  beforeAll(async () => {
    await startPostgresContainer();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [getTypeORMModule(), BaseLocaleModule, MailerModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
    initTypeormRepository(app);
    repositories = getTypeormRepository();
  });

  afterEach(async () => {
    await deleteRepositories();
  });

  afterAll(async () => {
    await stopPostgresContainer();
    await app.close();
  });

  async function createBalWithNumero() {
    const balId = await createBal({ nom: 'bal', commune: '91400' });
    const voieId = await createVoie(balId, { nom: 'rue de la paix' });
    const numeroId = await createNumero(balId, voieId, {
      numero: 1,
      positions: [createPositions()],
    });
    return { balId, voieId, numeroId };
  }

  describe('GET /bases-locales/:baseLocaleId/tiles/:z/:x/:y.pbf', () => {
    it('Return 200 with ETag and Cache-Control', async () => {
      const { balId } = await createBalWithNumero();

      const response = await request(app.getHttpServer())
        .get(`/bases-locales/${balId}/tiles/${z}/${x}/${y}.pbf`)
        .expect(200);

      expect(response.headers['etag']).toEqual(
        `W/"${balId}-${updatedAt.getTime()}"`,
      );
      expect(response.headers['cache-control']).toEqual('private, no-cache');
      expect(response.headers['content-type']).toContain(
        'application/x-protobuf',
      );
    });

    it('Return 304 when If-None-Match matches', async () => {
      const { balId } = await createBalWithNumero();

      const first = await request(app.getHttpServer())
        .get(`/bases-locales/${balId}/tiles/${z}/${x}/${y}.pbf`)
        .expect(200);

      const response = await request(app.getHttpServer())
        .get(`/bases-locales/${balId}/tiles/${z}/${x}/${y}.pbf`)
        .set('If-None-Match', first.headers['etag'])
        .expect(304);

      expect(response.headers['etag']).toEqual(first.headers['etag']);
      expect(response.body).toEqual({});
    });

    it('Return 304 when If-None-Match is a list containing the ETag', async () => {
      const { balId } = await createBalWithNumero();
      const etag = `W/"${balId}-${updatedAt.getTime()}"`;

      await request(app.getHttpServer())
        .get(`/bases-locales/${balId}/tiles/${z}/${x}/${y}.pbf`)
        .set('If-None-Match', `W/"${balId}-0", ${etag}`)
        .expect(304);
    });

    it('Return 304 when If-None-Match is the strong equivalent', async () => {
      const { balId } = await createBalWithNumero();

      await request(app.getHttpServer())
        .get(`/bases-locales/${balId}/tiles/${z}/${x}/${y}.pbf`)
        .set('If-None-Match', `"${balId}-${updatedAt.getTime()}"`)
        .expect(304);
    });

    it('Return 304 when If-None-Match is *', async () => {
      const { balId } = await createBalWithNumero();

      await request(app.getHttpServer())
        .get(`/bases-locales/${balId}/tiles/${z}/${x}/${y}.pbf`)
        .set('If-None-Match', '*')
        .expect(304);
    });

    it('Return 200 when client sends Cache-Control: no-cache', async () => {
      const { balId } = await createBalWithNumero();

      await request(app.getHttpServer())
        .get(`/bases-locales/${balId}/tiles/${z}/${x}/${y}.pbf`)
        .set('If-None-Match', `W/"${balId}-${updatedAt.getTime()}"`)
        .set('Cache-Control', 'no-cache')
        .expect(200);
    });

    it('Return 200 with new ETag after BAL modification', async () => {
      const { balId, numeroId } = await createBalWithNumero();

      const first = await request(app.getHttpServer())
        .get(`/bases-locales/${balId}/tiles/${z}/${x}/${y}.pbf`)
        .expect(200);

      await request(app.getHttpServer())
        .put(`/bases-locales/${balId}/numeros/batch`)
        .send({ numerosIds: [numeroId], changes: { certifie: true } })
        .set('authorization', `Bearer ${token}`)
        .expect(200);

      const response = await request(app.getHttpServer())
        .get(`/bases-locales/${balId}/tiles/${z}/${x}/${y}.pbf`)
        .set('If-None-Match', first.headers['etag'])
        .expect(200);

      const bal = await repositories.bals.findOneBy({ id: balId });
      expect(response.headers['etag']).not.toEqual(first.headers['etag']);
      expect(response.headers['etag']).toEqual(
        `W/"${balId}-${bal.updatedAt.getTime()}"`,
      );
    });

    it('Return 204 with ETag on empty tile, then 304', async () => {
      const { balId } = await createBalWithNumero();
      // Zoom 10 : en dessous du zoom minimum des couches
      const [ex, ey, ez] = pointToTile(8, 42, 10);

      const first = await request(app.getHttpServer())
        .get(`/bases-locales/${balId}/tiles/${ez}/${ex}/${ey}.pbf`)
        .expect(204);

      expect(first.headers['etag']).toBeDefined();
      expect(first.headers['cache-control']).toEqual('private, no-cache');

      await request(app.getHttpServer())
        .get(`/bases-locales/${balId}/tiles/${ez}/${ex}/${ey}.pbf`)
        .set('If-None-Match', first.headers['etag'])
        .expect(304);
    });
  });
});
