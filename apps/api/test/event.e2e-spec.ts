import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { ObjectId } from 'mongodb';
import { Repository } from 'typeorm';

import {
  Event,
  EventActionEnum,
  EventEntityTypeEnum,
} from '@/shared/entities/event.entity';
import { PositionTypeEnum } from '@/shared/entities/position.entity';
import { TypeNumerotationEnum } from '@/shared/entities/voie.entity';
import {
  SerializedNumero,
  SerializedVoie,
} from '@/shared/entities/event_payload.type';
import { EventModule } from '@/modules/event/event.module';
import { EventService } from '@/modules/event/event.service';
import { BaseLocaleModule } from '@/modules/base_locale/base_locale.module';
import { VoieModule } from '@/modules/voie/voie.module';
import { NumeroModule } from '@/modules/numeros/numero.module';
import { ToponymeModule } from '@/modules/toponyme/toponyme.module';
import { MailerModule } from '@/shared/test/mailer.module.test';
import { UpdateNumeroDTO } from '@/modules/numeros/dto/update_numero.dto';
import { DeleteBatchNumeroDTO } from '@/modules/numeros/dto/delete_batch_numero.dto';

import {
  token,
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

describe('EVENT MODULE', () => {
  let app: INestApplication;
  let eventService: EventService;
  let eventsRepository: Repository<Event>;

  beforeAll(async () => {
    await startPostgresContainer();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        getTypeORMModule(),
        BaseLocaleModule,
        VoieModule,
        NumeroModule,
        ToponymeModule,
        EventModule,
        MailerModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
    initTypeormRepository(app);
    eventsRepository = getTypeormRepository().events;
    eventService = app.get(EventService);
  });

  afterAll(async () => {
    await stopPostgresContainer();
    await app.close();
  });

  afterEach(async () => {
    await deleteRepositories();
  });

  function newEntityId() {
    return new ObjectId().toHexString();
  }

  // Minimal but properly-typed fixtures for the low-level EventService
  // tests below, which only care about the fusion/merge logic, not about
  // realistic entity content.
  function fakeSerializedNumero(numero: number): SerializedNumero {
    return {
      id: 'fixture-numero-id',
      banId: 'fixture-ban-id',
      createdAt: new Date('2000-01-01').toISOString(),
      balId: 'fixture-bal-id',
      voieId: 'fixture-voie-id',
      toponymeId: null,
      numero,
      suffixe: null,
      comment: null,
      parcelles: null,
      certifie: false,
      communeDeleguee: null,
    };
  }

  function fakeSerializedVoie(nom: string): SerializedVoie {
    return {
      id: 'fixture-voie-id',
      banId: 'fixture-ban-id',
      createdAt: new Date('2000-01-01').toISOString(),
      balId: 'fixture-bal-id',
      nom,
      nomAlt: null,
      typeNumerotation: TypeNumerotationEnum.NUMERIQUE,
      centroid: null,
      trace: null,
      bbox: null,
      codeVoie: null,
      comment: null,
    };
  }

  describe('EventService.register — fusion table', () => {
    it('CREATE with no current event -> INSERT (before: null)', async () => {
      const balId = await createBal({ nom: 'bal', commune: '91400' });
      const entityId = newEntityId();

      const event = await eventService.register(
        { balId },
        {
          entityType: EventEntityTypeEnum.NUMERO,
          entityId,
          action: EventActionEnum.CREATE,
          after: fakeSerializedNumero(1),
        },
      );

      expect(event.action).toEqual(EventActionEnum.CREATE);
      expect(event.payloadBefore).toBeNull();
      expect(event.payloadAfter).toEqual(fakeSerializedNumero(1));
      expect(event.isSynced).toBe(false);
    });

    it('UPDATE with no current event -> INSERT (before + after)', async () => {
      const balId = await createBal({ nom: 'bal', commune: '91400' });
      const entityId = newEntityId();

      const event = await eventService.register(
        { balId },
        {
          entityType: EventEntityTypeEnum.NUMERO,
          entityId,
          action: EventActionEnum.UPDATE,
          before: fakeSerializedNumero(1),
          after: fakeSerializedNumero(2),
        },
      );

      expect(event.action).toEqual(EventActionEnum.UPDATE);
      expect(event.payloadBefore).toEqual(fakeSerializedNumero(1));
      expect(event.payloadAfter).toEqual(fakeSerializedNumero(2));
    });

    it('DELETE with no current event -> INSERT (after: null)', async () => {
      const balId = await createBal({ nom: 'bal', commune: '91400' });
      const entityId = newEntityId();

      const event = await eventService.register(
        { balId },
        {
          entityType: EventEntityTypeEnum.NUMERO,
          entityId,
          action: EventActionEnum.DELETE,
          before: fakeSerializedNumero(1),
        },
      );

      expect(event.action).toEqual(EventActionEnum.DELETE);
      expect(event.payloadBefore).toEqual(fakeSerializedNumero(1));
      expect(event.payloadAfter).toBeNull();
    });

    it('UPDATE onto a current CREATE -> stays CREATE, after replaced', async () => {
      const balId = await createBal({ nom: 'bal', commune: '91400' });
      const entityId = newEntityId();

      await eventService.register(
        { balId },
        {
          entityType: EventEntityTypeEnum.NUMERO,
          entityId,
          action: EventActionEnum.CREATE,
          after: fakeSerializedNumero(1),
        },
      );
      const event = await eventService.register(
        { balId },
        {
          entityType: EventEntityTypeEnum.NUMERO,
          entityId,
          action: EventActionEnum.UPDATE,
          before: fakeSerializedNumero(1),
          after: fakeSerializedNumero(2),
        },
      );

      expect(event.action).toEqual(EventActionEnum.CREATE);
      expect(event.payloadBefore).toBeNull();
      expect(event.payloadAfter).toEqual(fakeSerializedNumero(2));

      const count = await eventsRepository.count();
      expect(count).toEqual(1);
    });

    it('UPDATE onto a current UPDATE -> stays UPDATE, before unchanged', async () => {
      const balId = await createBal({ nom: 'bal', commune: '91400' });
      const entityId = newEntityId();

      await eventService.register(
        { balId },
        {
          entityType: EventEntityTypeEnum.NUMERO,
          entityId,
          action: EventActionEnum.UPDATE,
          before: fakeSerializedNumero(1),
          after: fakeSerializedNumero(2),
        },
      );
      const event = await eventService.register(
        { balId },
        {
          entityType: EventEntityTypeEnum.NUMERO,
          entityId,
          action: EventActionEnum.UPDATE,
          before: fakeSerializedNumero(2),
          after: fakeSerializedNumero(3),
        },
      );

      expect(event.action).toEqual(EventActionEnum.UPDATE);
      expect(event.payloadBefore).toEqual(fakeSerializedNumero(1));
      expect(event.payloadAfter).toEqual(fakeSerializedNumero(3));

      const count = await eventsRepository.count();
      expect(count).toEqual(1);
    });

    it('DELETE onto a current CREATE -> the event is deleted entirely', async () => {
      const balId = await createBal({ nom: 'bal', commune: '91400' });
      const entityId = newEntityId();

      await eventService.register(
        { balId },
        {
          entityType: EventEntityTypeEnum.NUMERO,
          entityId,
          action: EventActionEnum.CREATE,
          after: fakeSerializedNumero(1),
        },
      );
      const result = await eventService.register(
        { balId },
        {
          entityType: EventEntityTypeEnum.NUMERO,
          entityId,
          action: EventActionEnum.DELETE,
          before: fakeSerializedNumero(1),
        },
      );

      expect(result).toBeNull();
      const count = await eventsRepository.count();
      expect(count).toEqual(0);
    });

    it('DELETE onto a current UPDATE -> becomes DELETE with the UPDATE original before', async () => {
      const balId = await createBal({ nom: 'bal', commune: '91400' });
      const entityId = newEntityId();

      await eventService.register(
        { balId },
        {
          entityType: EventEntityTypeEnum.NUMERO,
          entityId,
          action: EventActionEnum.UPDATE,
          before: fakeSerializedNumero(1),
          after: fakeSerializedNumero(2),
        },
      );
      const event = await eventService.register(
        { balId },
        {
          entityType: EventEntityTypeEnum.NUMERO,
          entityId,
          action: EventActionEnum.DELETE,
          before: fakeSerializedNumero(2),
        },
      );

      expect(event.action).toEqual(EventActionEnum.DELETE);
      expect(event.payloadBefore).toEqual(fakeSerializedNumero(1));
      expect(event.payloadAfter).toBeNull();

      const count = await eventsRepository.count();
      expect(count).toEqual(1);
    });

    it('CREATE onto a current DELETE (same id reused) -> merges into a single UPDATE', async () => {
      const balId = await createBal({ nom: 'bal', commune: '91400' });
      const entityId = newEntityId();

      await eventService.register(
        { balId },
        {
          entityType: EventEntityTypeEnum.NUMERO,
          entityId,
          action: EventActionEnum.DELETE,
          before: fakeSerializedNumero(1),
        },
      );
      const event = await eventService.register(
        { balId },
        {
          entityType: EventEntityTypeEnum.NUMERO,
          entityId,
          action: EventActionEnum.CREATE,
          after: fakeSerializedNumero(2),
        },
      );

      expect(event.action).toEqual(EventActionEnum.UPDATE);
      expect(event.payloadBefore).toEqual(fakeSerializedNumero(1));
      expect(event.payloadAfter).toEqual(fakeSerializedNumero(2));

      const count = await eventsRepository.count();
      expect(count).toEqual(1);
    });

    it('registering a second unsynced DELETE for the same entity is rejected defensively', async () => {
      const balId = await createBal({ nom: 'bal', commune: '91400' });
      const entityId = newEntityId();

      await eventService.register(
        { balId },
        {
          entityType: EventEntityTypeEnum.NUMERO,
          entityId,
          action: EventActionEnum.DELETE,
          before: fakeSerializedNumero(1),
        },
      );

      await expect(
        eventService.register(
          { balId },
          {
            entityType: EventEntityTypeEnum.NUMERO,
            entityId,
            action: EventActionEnum.DELETE,
            before: fakeSerializedNumero(1),
          },
        ),
      ).rejects.toThrow();
    });

    it('a composite covered entity is not fused with: a new independent event is created', async () => {
      const balId = await createBal({ nom: 'bal', commune: '91400' });
      const entityId = newEntityId();

      const sourceVoie = fakeSerializedVoie('rue source');
      const targetVoieBefore = fakeSerializedVoie('rue cible');
      await eventService.registerComposite(
        { balId },
        {
          action: EventActionEnum.MERGE_VOIES,
          before: {
            targetVoie: targetVoieBefore,
            sourceVoies: [sourceVoie],
          },
          after: {
            targetVoie: fakeSerializedVoie('rue cible'),
            movedNumeroIds: [],
          },
          entities: [{ entityType: EventEntityTypeEnum.VOIE, entityId }],
        },
      );

      const event = await eventService.register(
        { balId },
        {
          entityType: EventEntityTypeEnum.VOIE,
          entityId,
          action: EventActionEnum.UPDATE,
          before: fakeSerializedVoie('a'),
          after: fakeSerializedVoie('b'),
        },
      );

      expect(event.action).toEqual(EventActionEnum.UPDATE);
      expect(event.parentEventId).toBeNull();

      // The composite root (untouched, keeps its history) + the new
      // independent event, which superseded the composite's coverage row.
      const count = await eventsRepository.count();
      expect(count).toEqual(2);

      const compositeRoot = await eventsRepository.findOneBy({
        entityType: EventEntityTypeEnum.COMPOSITE,
      });
      expect(compositeRoot).not.toBeNull();
      expect(compositeRoot.payloadBefore).toEqual({
        targetVoie: targetVoieBefore,
        sourceVoies: [sourceVoie],
      });
    });
  });

  describe('EventService — combined scenarios', () => {
    it('create -> update -> update -> delete leaves no event', async () => {
      const balId = await createBal({ nom: 'bal', commune: '91400' });
      const entityId = newEntityId();

      await eventService.register(
        { balId },
        {
          entityType: EventEntityTypeEnum.NUMERO,
          entityId,
          action: EventActionEnum.CREATE,
          after: fakeSerializedNumero(1),
        },
      );
      await eventService.register(
        { balId },
        {
          entityType: EventEntityTypeEnum.NUMERO,
          entityId,
          action: EventActionEnum.UPDATE,
          before: fakeSerializedNumero(1),
          after: fakeSerializedNumero(2),
        },
      );
      await eventService.register(
        { balId },
        {
          entityType: EventEntityTypeEnum.NUMERO,
          entityId,
          action: EventActionEnum.UPDATE,
          before: fakeSerializedNumero(2),
          after: fakeSerializedNumero(3),
        },
      );
      const result = await eventService.register(
        { balId },
        {
          entityType: EventEntityTypeEnum.NUMERO,
          entityId,
          action: EventActionEnum.DELETE,
          before: fakeSerializedNumero(3),
        },
      );

      expect(result).toBeNull();
      const count = await eventsRepository.count();
      expect(count).toEqual(0);
    });

    it('update -> delete leaves a single DELETE event carrying the original before', async () => {
      const balId = await createBal({ nom: 'bal', commune: '91400' });
      const entityId = newEntityId();

      await eventService.register(
        { balId },
        {
          entityType: EventEntityTypeEnum.NUMERO,
          entityId,
          action: EventActionEnum.UPDATE,
          before: fakeSerializedNumero(1),
          after: fakeSerializedNumero(2),
        },
      );
      await eventService.register(
        { balId },
        {
          entityType: EventEntityTypeEnum.NUMERO,
          entityId,
          action: EventActionEnum.DELETE,
          before: fakeSerializedNumero(2),
        },
      );

      const events = await eventsRepository.find({ where: { entityId } });
      expect(events).toHaveLength(1);
      expect(events[0].action).toEqual(EventActionEnum.DELETE);
      expect(events[0].payloadBefore).toEqual(fakeSerializedNumero(1));
    });

    it('update on an entity whose event is already synced creates a new event, leaving the old one intact', async () => {
      const balId = await createBal({ nom: 'bal', commune: '91400' });
      const entityId = newEntityId();

      const syncedEvent = await eventService.register(
        { balId },
        {
          entityType: EventEntityTypeEnum.NUMERO,
          entityId,
          action: EventActionEnum.UPDATE,
          before: fakeSerializedNumero(1),
          after: fakeSerializedNumero(2),
        },
      );
      await eventsRepository.update(
        { id: syncedEvent.id },
        { isSynced: true, syncedAt: new Date() },
      );

      const newEvent = await eventService.register(
        { balId },
        {
          entityType: EventEntityTypeEnum.NUMERO,
          entityId,
          action: EventActionEnum.UPDATE,
          before: fakeSerializedNumero(2),
          after: fakeSerializedNumero(3),
        },
      );

      expect(newEvent.id).not.toEqual(syncedEvent.id);
      expect(newEvent.payloadBefore).toEqual(fakeSerializedNumero(2));
      expect(newEvent.payloadAfter).toEqual(fakeSerializedNumero(3));

      const oldEvent = await eventsRepository.findOneBy({
        id: syncedEvent.id,
      });
      expect(oldEvent.payloadBefore).toEqual(fakeSerializedNumero(1));
      expect(oldEvent.payloadAfter).toEqual(fakeSerializedNumero(2));
      expect(oldEvent.isSynced).toBe(true);

      const count = await eventsRepository.count();
      expect(count).toEqual(2);
    });
  });

  describe('composite operations (e2e)', () => {
    it('updating a numero and its positions emits 1 event per position change, all sharing the same root', async () => {
      const balId = await createBal({ nom: 'bal', commune: '91400' });
      const voieId = await createVoie(balId, { nom: 'rue de la paix' });
      const numeroId = await createNumero(balId, voieId, {
        numero: 1,
        positions: [createPositions([8, 42]), createPositions([8.1, 42.1])],
      });
      const numeroCreated = await getTypeormRepository().numeros.findOneBy({
        id: numeroId,
      });
      const [positionA, positionB] = numeroCreated.positions;

      // NumeroService.update() replaces the whole `positions` array on save
      // (Position ids are always regenerated on insert, see
      // `GlobalEntity`/`Position`'s `@BeforeInsert`) — even a position sent
      // back unchanged is therefore deleted and recreated under a new id,
      // never matched in place. Only one of the two original positions is
      // resent here, so the diff is expected to be: 1 CREATE (new position)
      // + 2 DELETE (both original ones, since neither id survives the save).
      const updateNumeroDto: UpdateNumeroDTO = {
        positions: [
          { ...positionA, type: PositionTypeEnum.BATIMENT },
          {
            id: new ObjectId().toHexString(),
            type: PositionTypeEnum.ENTREE,
            source: 'ban',
            point: { type: 'Point', coordinates: [8.2, 42.2] },
          },
        ],
      };

      await request(app.getHttpServer())
        .put(`/numeros/${numeroId}`)
        .send(updateNumeroDto)
        .set('authorization', `Bearer ${token}`)
        .expect(200);

      const events = await eventsRepository.find({
        where: { balId },
        order: { createdAt: 'ASC' },
      });
      expect(events).toHaveLength(5);

      const numeroEvent = events.find(
        (e) => e.entityType === EventEntityTypeEnum.NUMERO,
      );
      expect(numeroEvent.action).toEqual(EventActionEnum.UPDATE);
      expect(numeroEvent.parentEventId).toBeNull();

      const positionEvents = events.filter(
        (e) => e.entityType === EventEntityTypeEnum.POSITION,
      );
      expect(positionEvents).toHaveLength(4);
      for (const event of positionEvents) {
        expect(event.parentEventId).toEqual(numeroEvent.id);
      }
      const deletedIds = positionEvents
        .filter((e) => e.action === EventActionEnum.DELETE)
        .map((e) => e.entityId);
      const createdCount = positionEvents.filter(
        (e) => e.action === EventActionEnum.CREATE,
      ).length;
      expect(deletedIds.sort()).toEqual([positionA.id, positionB.id].sort());
      expect(createdCount).toEqual(2);
    });

    it('deleting multiple numeros emits 1 DELETE event per numero, all sharing the same root', async () => {
      const balId = await createBal({ nom: 'bal', commune: '91400' });
      const voieId = await createVoie(balId, { nom: 'rue de la paix' });
      const numeroId1 = await createNumero(balId, voieId, { numero: 1 });
      const numeroId2 = await createNumero(balId, voieId, { numero: 2 });

      const deleteBatch: DeleteBatchNumeroDTO = {
        numerosIds: [numeroId1, numeroId2],
      };
      await request(app.getHttpServer())
        .delete(`/bases-locales/${balId}/numeros/batch`)
        .send(deleteBatch)
        .set('authorization', `Bearer ${token}`)
        .expect(204);

      const numeroEvents = await eventsRepository.find({
        where: { balId, entityType: EventEntityTypeEnum.NUMERO },
      });
      expect(numeroEvents).toHaveLength(2);
      expect(
        numeroEvents.every((e) => e.action === EventActionEnum.DELETE),
      ).toBe(true);

      const roots = numeroEvents.filter((e) => e.parentEventId === null);
      const children = numeroEvents.filter((e) => e.parentEventId !== null);
      expect(roots).toHaveLength(1);
      expect(children).toHaveLength(1);
      expect(children[0].parentEventId).toEqual(roots[0].id);
    });

    it('converting a voie to a toponyme emits a single composite event covering both entities', async () => {
      const balId = await createBal({ nom: 'bal', commune: '91400' });
      const voieId = await createVoie(balId, { nom: 'rue de la paix' });

      const response = await request(app.getHttpServer())
        .put(`/voies/${voieId}/convert-to-toponyme`)
        .set('authorization', `Bearer ${token}`)
        .expect(200);
      const toponymeId = response.body.id;

      const events = await eventsRepository.find({ where: { balId } });
      expect(events).toHaveLength(3);

      const root = events.find(
        (e) => e.entityType === EventEntityTypeEnum.COMPOSITE,
      );
      expect(root.action).toEqual(EventActionEnum.CONVERT_VOIE_TO_TOPONYME);
      expect(root.entityId).toBeNull();
      expect(root.parentEventId).toBeNull();

      const children = events.filter((e) => e.id !== root.id);
      expect(children).toHaveLength(2);
      expect(children.every((e) => e.parentEventId === root.id)).toBe(true);
      expect(
        children.find((e) => e.entityType === EventEntityTypeEnum.VOIE)
          .entityId,
      ).toEqual(voieId);
      expect(
        children.find((e) => e.entityType === EventEntityTypeEnum.TOPONYME)
          .entityId,
      ).toEqual(toponymeId);
    });

    it('merging voies emits a single composite event covering the target voie, source voies and moved numeros', async () => {
      const balId = await createBal({ nom: 'bal', commune: '91400' });
      const targetVoieId = await createVoie(balId, { nom: 'rue cible' });
      const sourceVoieId = await createVoie(balId, { nom: 'rue source' });
      const movedNumeroId = await createNumero(balId, sourceVoieId, {
        numero: 1,
      });

      await request(app.getHttpServer())
        .put(`/voies/${targetVoieId}/fusion`)
        .send({ otherVoieIds: [sourceVoieId] })
        .set('authorization', `Bearer ${token}`)
        .expect(200);

      const events = await eventsRepository.find({ where: { balId } });
      expect(events).toHaveLength(4);

      const root = events.find(
        (e) => e.entityType === EventEntityTypeEnum.COMPOSITE,
      );
      expect(root.action).toEqual(EventActionEnum.MERGE_VOIES);
      expect(root.parentEventId).toBeNull();

      const children = events.filter((e) => e.id !== root.id);
      expect(children).toHaveLength(3);
      expect(children.every((e) => e.parentEventId === root.id)).toBe(true);
      const childEntityIds = children.map((e) => e.entityId);
      expect(childEntityIds).toEqual(
        expect.arrayContaining([targetVoieId, sourceVoieId, movedNumeroId]),
      );
    });

    it('deleting a voie emits cascading DELETE events on its numeros and positions', async () => {
      const balId = await createBal({ nom: 'bal', commune: '91400' });
      const voieId = await createVoie(balId, { nom: 'rue de la paix' });
      const numeroId1 = await createNumero(balId, voieId, {
        numero: 1,
        positions: [createPositions([8, 42])],
      });
      const numeroId2 = await createNumero(balId, voieId, {
        numero: 2,
        positions: [createPositions([8.1, 42.1])],
      });

      await request(app.getHttpServer())
        .delete(`/voies/${voieId}`)
        .set('authorization', `Bearer ${token}`)
        .expect(204);

      const events = await eventsRepository.find({ where: { balId } });
      expect(events).toHaveLength(5);

      const voieEvent = events.find(
        (e) => e.entityType === EventEntityTypeEnum.VOIE,
      );
      expect(voieEvent.action).toEqual(EventActionEnum.DELETE);
      expect(voieEvent.parentEventId).toBeNull();

      const numeroEvents = events.filter(
        (e) => e.entityType === EventEntityTypeEnum.NUMERO,
      );
      expect(numeroEvents).toHaveLength(2);
      expect(numeroEvents.map((e) => e.entityId)).toEqual(
        expect.arrayContaining([numeroId1, numeroId2]),
      );
      expect(numeroEvents.every((e) => e.parentEventId === voieEvent.id)).toBe(
        true,
      );

      const positionEvents = events.filter(
        (e) => e.entityType === EventEntityTypeEnum.POSITION,
      );
      expect(positionEvents).toHaveLength(2);
      expect(
        positionEvents.every((e) => e.parentEventId === voieEvent.id),
      ).toBe(true);
    });
  });

  describe('GET /bases-locales/:baseLocaleId/events', () => {
    it('requires an admin token', async () => {
      const balId = await createBal({ nom: 'bal', commune: '91400' });

      await request(app.getHttpServer())
        .get(`/bases-locales/${balId}/events`)
        .expect(403);
    });

    it('lists root events with their children, most recent first', async () => {
      const balId = await createBal({ nom: 'bal', commune: '91400' });
      const voieId = await createVoie(balId, { nom: 'rue de la paix' });

      // Root event #1: VOIE UPDATE, no children.
      await request(app.getHttpServer())
        .put(`/voies/${voieId}`)
        .send({ nom: 'nouvelle rue' })
        .set('authorization', `Bearer ${token}`)
        .expect(200);

      // Root event #2: NUMERO CREATE, with 2 POSITION CREATE children.
      await request(app.getHttpServer())
        .post(`/voies/${voieId}/numeros`)
        .send({
          numero: 1,
          positions: [createPositions([8, 42]), createPositions([8.1, 42.1])],
        })
        .set('authorization', `Bearer ${token}`)
        .expect(201);

      const response = await request(app.getHttpServer())
        .get(`/bases-locales/${balId}/events`)
        .set('authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.count).toEqual(2);
      expect(response.body.offset).toEqual(0);
      expect(response.body.limit).toEqual(20);
      expect(response.body.results).toHaveLength(2);

      const [numeroRoot, voieRoot] = response.body.results;
      expect(numeroRoot.entityType).toEqual(EventEntityTypeEnum.NUMERO);
      expect(numeroRoot.action).toEqual(EventActionEnum.CREATE);
      expect(numeroRoot.childEvents).toHaveLength(2);
      expect(
        numeroRoot.childEvents.every(
          (c) => c.entityType === EventEntityTypeEnum.POSITION,
        ),
      ).toBe(true);

      expect(voieRoot.entityType).toEqual(EventEntityTypeEnum.VOIE);
      expect(voieRoot.action).toEqual(EventActionEnum.UPDATE);
      expect(voieRoot.childEvents).toHaveLength(0);
    });

    it('filters roots and children by isSynced', async () => {
      const balId = await createBal({ nom: 'bal', commune: '91400' });
      const voieId = await createVoie(balId, { nom: 'rue de la paix' });

      await request(app.getHttpServer())
        .put(`/voies/${voieId}`)
        .send({ nom: 'nouvelle rue' })
        .set('authorization', `Bearer ${token}`)
        .expect(200);
      await request(app.getHttpServer())
        .post(`/voies/${voieId}/numeros`)
        .send({
          numero: 1,
          positions: [createPositions([8, 42])],
        })
        .set('authorization', `Bearer ${token}`)
        .expect(201);

      const voieRootEvent = await eventsRepository.findOneBy({
        balId,
        entityType: EventEntityTypeEnum.VOIE,
      });
      await eventsRepository.update(
        { id: voieRootEvent.id },
        { isSynced: true, syncedAt: new Date() },
      );

      const syncedResponse = await request(app.getHttpServer())
        .get(`/bases-locales/${balId}/events?isSynced=true`)
        .set('authorization', `Bearer ${token}`)
        .expect(200);
      expect(syncedResponse.body.count).toEqual(1);
      expect(syncedResponse.body.results[0].id).toEqual(voieRootEvent.id);

      const unsyncedResponse = await request(app.getHttpServer())
        .get(`/bases-locales/${balId}/events?isSynced=false`)
        .set('authorization', `Bearer ${token}`)
        .expect(200);
      expect(unsyncedResponse.body.count).toEqual(1);
      expect(unsyncedResponse.body.results[0].entityType).toEqual(
        EventEntityTypeEnum.NUMERO,
      );
      expect(unsyncedResponse.body.results[0].childEvents).toHaveLength(1);
    });

    it('paginates root events, most recent first', async () => {
      const balId = await createBal({ nom: 'bal', commune: '91400' });
      const voieId1 = await createVoie(balId, { nom: 'rue A' });
      const voieId2 = await createVoie(balId, { nom: 'rue B' });

      await request(app.getHttpServer())
        .put(`/voies/${voieId1}`)
        .send({ nom: 'rue A modifiée' })
        .set('authorization', `Bearer ${token}`)
        .expect(200);
      await request(app.getHttpServer())
        .put(`/voies/${voieId2}`)
        .send({ nom: 'rue B modifiée' })
        .set('authorization', `Bearer ${token}`)
        .expect(200);

      const firstPage = await request(app.getHttpServer())
        .get(`/bases-locales/${balId}/events?limit=1&offset=0`)
        .set('authorization', `Bearer ${token}`)
        .expect(200);
      expect(firstPage.body.count).toEqual(2);
      expect(firstPage.body.results).toHaveLength(1);
      expect(firstPage.body.results[0].entityId).toEqual(voieId2);

      const secondPage = await request(app.getHttpServer())
        .get(`/bases-locales/${balId}/events?limit=1&offset=1`)
        .set('authorization', `Bearer ${token}`)
        .expect(200);
      expect(secondPage.body.count).toEqual(2);
      expect(secondPage.body.results).toHaveLength(1);
      expect(secondPage.body.results[0].entityId).toEqual(voieId1);
    });

    it('validates limit/offset bounds', async () => {
      const balId = await createBal({ nom: 'bal', commune: '91400' });

      await request(app.getHttpServer())
        .get(`/bases-locales/${balId}/events?limit=0`)
        .set('authorization', `Bearer ${token}`)
        .expect(400);
      await request(app.getHttpServer())
        .get(`/bases-locales/${balId}/events?limit=101`)
        .set('authorization', `Bearer ${token}`)
        .expect(400);
      await request(app.getHttpServer())
        .get(`/bases-locales/${balId}/events?offset=-1`)
        .set('authorization', `Bearer ${token}`)
        .expect(400);
    });
  });
});
