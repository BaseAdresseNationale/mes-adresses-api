import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { ObjectId } from 'mongodb';
import { IsNull, Not, Repository } from 'typeorm';

import {
  Event,
  EventActionEnum,
  EventEntityTypeEnum,
} from '@/shared/entities/event.entity';
import { PositionTypeEnum } from '@/shared/entities/position.entity';
import {
  SerializedNumero,
  SerializedToponyme,
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
  createToponyme,
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

  // `payloadBefore`/`payloadAfter` are typed as the `EventPayload` union —
  // this narrows to the TOPONYME shape for the junction event tests below.
  function numeroIdsOf(payload: Event['payloadBefore']): string[] {
    return (payload as SerializedToponyme).numeroIds;
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
      numero,
      suffixe: null,
      comment: null,
      parcelles: null,
      certifie: false,
      communeDeleguee: null,
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
      expect(event.isSyncedWithRevision).toBeNull();
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

    it('UPDATE onto a current UPDATE, back to the original before -> the event is deleted entirely', async () => {
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
      const result = await eventService.register(
        { balId },
        {
          entityType: EventEntityTypeEnum.NUMERO,
          entityId,
          action: EventActionEnum.UPDATE,
          before: fakeSerializedNumero(2),
          after: fakeSerializedNumero(1),
        },
      );

      expect(result).toBeNull();
      const count = await eventsRepository.count();
      expect(count).toEqual(0);
    });

    it('same cancellation applies to POSITION (generic fuse() mechanism, entity-agnostic)', async () => {
      const balId = await createBal({ nom: 'bal', commune: '91400' });
      const entityId = newEntityId();
      const fakePosition = (rank: number) => ({
        id: 'fixture-position-id',
        toponymeId: null,
        numeroId: 'fixture-numero-id',
        type: PositionTypeEnum.ENTREE,
        source: null,
        rank,
        point: { type: 'Point' as const, coordinates: [8, 42] },
      });

      await eventService.register(
        { balId },
        {
          entityType: EventEntityTypeEnum.POSITION,
          entityId,
          action: EventActionEnum.UPDATE,
          before: fakePosition(0),
          after: fakePosition(1),
        },
      );
      const result = await eventService.register(
        { balId },
        {
          entityType: EventEntityTypeEnum.POSITION,
          entityId,
          action: EventActionEnum.UPDATE,
          before: fakePosition(1),
          after: fakePosition(0),
        },
      );

      expect(result).toBeNull();
      const count = await eventsRepository.count();
      expect(count).toEqual(0);
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
        { isSyncedWithRevision: 'fixture-revision-id' },
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
      expect(oldEvent.isSyncedWithRevision).not.toBeNull();

      const count = await eventsRepository.count();
      expect(count).toEqual(2);
    });
  });

  describe('composite operations (e2e)', () => {
    it("updating only a numero's positions (numero fields unchanged) still creates a trivial NUMERO UPDATE container parenting the POSITION events", async () => {
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

      // `positionA`'s id is resent and now survives validation (Position.id
      // has an `@IsMongoId()` decorator), so NumeroService.update()'s
      // cascade save correctly matches and updates it in place — no more
      // id regeneration/DELETE+CREATE for a position that's still there.
      // `positionB` isn't resent (real removal) and a brand new position is
      // added, so the diff is expected to be: 1 UPDATE + 1 DELETE + 1 CREATE.
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
      // A POSITION event must never be a root: even though the numero's own
      // fields never changed, a trivial (before === after) NUMERO UPDATE
      // event is created purely to parent the 3 position events below.
      expect(events).toHaveLength(4);

      const numeroEvent = events.find(
        (e) => e.entityType === EventEntityTypeEnum.NUMERO,
      );
      expect(numeroEvent.action).toEqual(EventActionEnum.UPDATE);
      expect(numeroEvent.payloadBefore).toEqual(numeroEvent.payloadAfter);
      expect(numeroEvent.parentEventId).toBeNull();

      const positionEvents = events.filter(
        (e) => e.entityType === EventEntityTypeEnum.POSITION,
      );
      expect(positionEvents).toHaveLength(3);
      expect(
        positionEvents.every((e) => e.parentEventId === numeroEvent.id),
      ).toBe(true);

      const updateEvent = positionEvents.find(
        (e) => e.action === EventActionEnum.UPDATE,
      );
      expect(updateEvent.entityId).toEqual(positionA.id);
      expect(updateEvent.payloadBefore).toMatchObject({ type: 'entrée' });
      expect(updateEvent.payloadAfter).toMatchObject({ type: 'bâtiment' });

      const deleteEvent = positionEvents.find(
        (e) => e.action === EventActionEnum.DELETE,
      );
      expect(deleteEvent.entityId).toEqual(positionB.id);

      const createEvent = positionEvents.find(
        (e) => e.action === EventActionEnum.CREATE,
      );
      expect(createEvent).toBeDefined();
    });

    it('reuses the same trivial NUMERO container across two successive position-only updates (never orphaning the child)', async () => {
      const balId = await createBal({ nom: 'bal', commune: '91400' });
      const voieResponse = await request(app.getHttpServer())
        .post(`/bases-locales/${balId}/voies`)
        .send({ nom: 'rue de la paix' })
        .set('authorization', `Bearer ${token}`)
        .expect(201);
      const voieId = voieResponse.body.id;

      // The voie's own CREATE is marked synced so its numero's CREATE isn't
      // itself pending — isolating this test to the position-only-update
      // container mechanism (fuse()'s children guard).
      await eventsRepository.update(
        { balId },
        { isSyncedWithRevision: 'fixture-revision-id' },
      );

      const numeroResponse = await request(app.getHttpServer())
        .post(`/voies/${voieId}/numeros`)
        .send({ numero: 1, positions: [createPositions([8, 42])] })
        .set('authorization', `Bearer ${token}`)
        .expect(201);
      const numeroId = numeroResponse.body.id;
      await eventsRepository.update(
        { balId, entityType: EventEntityTypeEnum.NUMERO },
        { isSyncedWithRevision: 'fixture-revision-id' },
      );
      await eventsRepository.update(
        { balId, entityType: EventEntityTypeEnum.POSITION },
        { isSyncedWithRevision: 'fixture-revision-id' },
      );
      const numeroCreated = await getTypeormRepository().numeros.findOneBy({
        id: numeroId,
      });
      const [position] = numeroCreated.positions;

      await request(app.getHttpServer())
        .put(`/numeros/${numeroId}`)
        .send({
          numero: 1,
          positions: [
            {
              id: position.id,
              type: position.type,
              source: position.source,
              point: { type: 'Point', coordinates: [9, 43] },
            },
          ],
        })
        .set('authorization', `Bearer ${token}`)
        .expect(200);

      const containerAfterFirstCall = await eventsRepository.findOneBy({
        balId,
        entityType: EventEntityTypeEnum.NUMERO,
        isSyncedWithRevision: IsNull(),
      });
      expect(containerAfterFirstCall).not.toBeNull();

      await request(app.getHttpServer())
        .put(`/numeros/${numeroId}`)
        .send({
          numero: 1,
          positions: [
            {
              id: position.id,
              type: position.type,
              source: position.source,
              point: { type: 'Point', coordinates: [10, 44] },
            },
          ],
        })
        .set('authorization', `Bearer ${token}`)
        .expect(200);

      const numeroEvents = await eventsRepository.find({
        where: {
          balId,
          entityType: EventEntityTypeEnum.NUMERO,
          isSyncedWithRevision: IsNull(),
        },
      });
      // Still the very same trivial container — not recreated, and not
      // cancelled by the "back to original" fuse() logic even though the
      // numero's own fields never changed across both calls, because it
      // still has a live child depending on it.
      expect(numeroEvents).toHaveLength(1);
      expect(numeroEvents[0].id).toEqual(containerAfterFirstCall.id);

      const positionEvent = await eventsRepository.findOneBy({
        balId,
        entityType: EventEntityTypeEnum.POSITION,
        isSyncedWithRevision: IsNull(),
      });
      expect(positionEvent.parentEventId).toEqual(numeroEvents[0].id);
      expect(positionEvent.payloadAfter).toMatchObject({
        point: { type: 'Point', coordinates: [10, 44] },
      });
    });

    it('emits a single non-trivial NUMERO UPDATE event when both a real field and a position change together', async () => {
      const balId = await createBal({ nom: 'bal', commune: '91400' });
      const voieId = await createVoie(balId, { nom: 'rue de la paix' });
      const numeroId = await createNumero(balId, voieId, {
        numero: 1,
        positions: [createPositions([8, 42])],
      });
      const numeroCreated = await getTypeormRepository().numeros.findOneBy({
        id: numeroId,
      });
      const [position] = numeroCreated.positions;

      await request(app.getHttpServer())
        .put(`/numeros/${numeroId}`)
        .send({
          numero: 2,
          positions: [
            {
              id: position.id,
              type: position.type,
              source: position.source,
              point: { type: 'Point', coordinates: [9, 43] },
            },
          ],
        })
        .set('authorization', `Bearer ${token}`)
        .expect(200);

      const numeroEvents = await eventsRepository.find({
        where: { balId, entityType: EventEntityTypeEnum.NUMERO },
      });
      expect(numeroEvents).toHaveLength(1);
      expect(numeroEvents[0].payloadBefore).not.toEqual(
        numeroEvents[0].payloadAfter,
      );

      const positionEvents = await eventsRepository.find({
        where: { balId, entityType: EventEntityTypeEnum.POSITION },
      });
      expect(positionEvents).toHaveLength(1);
      expect(positionEvents[0].action).toEqual(EventActionEnum.UPDATE);
      expect(positionEvents[0].parentEventId).toEqual(numeroEvents[0].id);
    });

    it('deleting multiple numeros emits 1 independent root DELETE event per numero', async () => {
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
      // Each numero's DELETE is its own independent root — no more shared
      // batch root: a numero's positions are always children of its own
      // numero event, never siblings chained under a different numero.
      expect(numeroEvents.every((e) => e.parentEventId === null)).toBe(true);

      const positionEvents = await eventsRepository.find({
        where: { balId, entityType: EventEntityTypeEnum.POSITION },
      });
      expect(positionEvents).toHaveLength(2);
      for (const positionEvent of positionEvents) {
        const owningNumeroEvent = numeroEvents.find(
          (e) => e.id === positionEvent.parentEventId,
        );
        expect(owningNumeroEvent).toBeDefined();
      }
    });

    it('converting a voie to a toponyme emits independent DELETE (voie) and CREATE (toponyme) root events', async () => {
      const balId = await createBal({ nom: 'bal', commune: '91400' });
      const voieId = await createVoie(balId, { nom: 'rue de la paix' });

      const response = await request(app.getHttpServer())
        .put(`/voies/${voieId}/convert-to-toponyme`)
        .set('authorization', `Bearer ${token}`)
        .expect(200);
      const toponymeId = response.body.id;

      const events = await eventsRepository.find({ where: { balId } });
      expect(events).toHaveLength(2);
      expect(events.every((e) => e.parentEventId === null)).toBe(true);

      const voieEvent = events.find(
        (e) => e.entityType === EventEntityTypeEnum.VOIE,
      );
      expect(voieEvent.action).toEqual(EventActionEnum.DELETE);
      expect(voieEvent.entityId).toEqual(voieId);

      const toponymeEvent = events.find(
        (e) => e.entityType === EventEntityTypeEnum.TOPONYME,
      );
      expect(toponymeEvent.action).toEqual(EventActionEnum.CREATE);
      expect(toponymeEvent.entityId).toEqual(toponymeId);
    });

    it('merging voies deletes every source/target voie for real and recreates a fresh voie+numeros tree', async () => {
      const balId = await createBal({ nom: 'bal', commune: '91400' });
      const targetVoieId = await createVoie(balId, { nom: 'rue cible' });
      const targetNumeroId = await createNumero(balId, targetVoieId, {
        numero: 1,
      });
      const sourceVoieId = await createVoie(balId, { nom: 'rue source' });
      const movedNumeroId = await createNumero(balId, sourceVoieId, {
        numero: 2,
      });

      const response = await request(app.getHttpServer())
        .put(`/voies/${targetVoieId}/fusion`)
        .send({ otherVoieIds: [sourceVoieId] })
        .set('authorization', `Bearer ${token}`)
        .expect(200);
      const newVoieId = response.body.id;
      expect(newVoieId).not.toEqual(targetVoieId);

      const voieEvents = await eventsRepository.find({
        where: { balId, entityType: EventEntityTypeEnum.VOIE },
      });
      expect(voieEvents).toHaveLength(3);
      const deletedVoieEvents = voieEvents.filter(
        (e) => e.action === EventActionEnum.DELETE,
      );
      expect(deletedVoieEvents.map((e) => e.entityId).sort()).toEqual(
        [targetVoieId, sourceVoieId].sort(),
      );
      const newVoieEvent = voieEvents.find((e) => e.entityId === newVoieId);
      expect(newVoieEvent.action).toEqual(EventActionEnum.CREATE);
      expect(newVoieEvent.parentEventId).toBeNull();

      const numeroEvents = await eventsRepository.find({
        where: { balId, entityType: EventEntityTypeEnum.NUMERO },
      });
      // 2 DELETE (the pre-merge numeros, under their old voies) + 2 CREATE
      // (recreated with fresh ids under the new voie).
      expect(numeroEvents).toHaveLength(4);
      const deletedNumeroEvents = numeroEvents.filter(
        (e) => e.action === EventActionEnum.DELETE,
      );
      expect(deletedNumeroEvents.map((e) => e.entityId).sort()).toEqual(
        [targetNumeroId, movedNumeroId].sort(),
      );

      const createdNumeroEvents = numeroEvents.filter(
        (e) => e.action === EventActionEnum.CREATE,
      );
      expect(createdNumeroEvents).toHaveLength(2);
      expect(
        createdNumeroEvents.every((e) => e.parentEventId === newVoieEvent.id),
      ).toBe(true);
      expect(createdNumeroEvents.map((e) => e.entityId)).not.toEqual(
        expect.arrayContaining([targetNumeroId, movedNumeroId]),
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

      // Positions are nested under their own numero event, not flattened
      // directly under the voie — the tree is VOIE -> NUMERO -> POSITION.
      const positionEvents = events.filter(
        (e) => e.entityType === EventEntityTypeEnum.POSITION,
      );
      expect(positionEvents).toHaveLength(2);
      for (const positionEvent of positionEvents) {
        const owningNumeroEvent = numeroEvents.find(
          (e) => e.id === positionEvent.parentEventId,
        );
        expect(owningNumeroEvent).toBeDefined();
      }
    });

    it('deleting a voie reparents the orphan DELETE event of a numero already deleted independently beforehand', async () => {
      const balId = await createBal({ nom: 'bal', commune: '91400' });
      const voieId = await createVoie(balId, { nom: 'rue de la paix' });
      const numeroId = await createNumero(balId, voieId, {
        numero: 1,
        positions: [createPositions([8, 42])],
      });

      // Simulate a previous publication: the voie and numero CREATE events
      // (and the position's) are already synced, so deleting the numero
      // now produces a genuine standalone DELETE event instead of the
      // CREATE+DELETE fusing away to nothing.
      await eventsRepository.update(
        { balId },
        { isSyncedWithRevision: 'fixture-revision-id' },
      );

      await request(app.getHttpServer())
        .delete(`/numeros/${numeroId}`)
        .set('authorization', `Bearer ${token}`)
        .expect(204);

      const numeroDeleteEvent = await eventsRepository.findOneBy({
        balId,
        entityType: EventEntityTypeEnum.NUMERO,
        entityId: numeroId,
        isSyncedWithRevision: IsNull(),
      });
      expect(numeroDeleteEvent.action).toEqual(EventActionEnum.DELETE);
      expect(numeroDeleteEvent.parentEventId).toBeNull();

      const positionDeleteEventBefore = await eventsRepository.findOneBy({
        balId,
        entityType: EventEntityTypeEnum.POSITION,
        isSyncedWithRevision: IsNull(),
      });
      expect(positionDeleteEventBefore.parentEventId).toEqual(
        numeroDeleteEvent.id,
      );

      // The voie itself still exists (only the numero was deleted): delete
      // it now, independently.
      await request(app.getHttpServer())
        .delete(`/voies/${voieId}`)
        .set('authorization', `Bearer ${token}`)
        .expect(204);

      const voieDeleteEvent = await eventsRepository.findOneBy({
        balId,
        entityType: EventEntityTypeEnum.VOIE,
        entityId: voieId,
        isSyncedWithRevision: IsNull(),
      });
      expect(voieDeleteEvent.action).toEqual(EventActionEnum.DELETE);
      expect(voieDeleteEvent.parentEventId).toBeNull();

      // The previously-orphaned numero DELETE event is now a child of the
      // voie's DELETE event — its own position child is left untouched
      // (still a child of the numero event): VOIE -> NUMERO -> POSITION.
      const reparentedNumeroEvent = await eventsRepository.findOneBy({
        id: numeroDeleteEvent.id,
      });
      expect(reparentedNumeroEvent.parentEventId).toEqual(voieDeleteEvent.id);

      const positionEventAfter = await eventsRepository.findOneBy({
        id: positionDeleteEventBefore.id,
      });
      expect(positionEventAfter.parentEventId).toEqual(numeroDeleteEvent.id);

      // The whole unpublished history for this voie now forms a single
      // tree — confirmed through the read API too.
      const response = await request(app.getHttpServer())
        .get(`/bases-locales/${balId}/events?isSynced=false`)
        .set('authorization', `Bearer ${token}`)
        .expect(200);
      expect(response.body.count).toEqual(1);
      expect(response.body.results[0].id).toEqual(voieDeleteEvent.id);
      expect(response.body.results[0].childEvents).toHaveLength(1);
      expect(response.body.results[0].childEvents[0].id).toEqual(
        numeroDeleteEvent.id,
      );
      expect(response.body.results[0].childEvents[0].childEvents).toHaveLength(
        1,
      );
      expect(response.body.results[0].childEvents[0].childEvents[0].id).toEqual(
        positionDeleteEventBefore.id,
      );
    });

    // These 3 tests need the voie's own CREATE event to actually exist and
    // be unsynced — the `createVoie`/`createNumero` fixtures insert directly
    // via the repository (no event emitted), so voie and numero are created
    // through the HTTP API here instead.
    it('creating a numero under a not-yet-synced voie nests its CREATE event under the voie CREATE event', async () => {
      const balId = await createBal({ nom: 'bal', commune: '91400' });
      const voieResponse = await request(app.getHttpServer())
        .post(`/bases-locales/${balId}/voies`)
        .send({ nom: 'rue de la paix' })
        .set('authorization', `Bearer ${token}`)
        .expect(201);
      const voieId = voieResponse.body.id;

      const voieCreateEvent = await eventsRepository.findOneBy({
        balId,
        entityType: EventEntityTypeEnum.VOIE,
        entityId: voieId,
      });
      expect(voieCreateEvent.isSyncedWithRevision).toBeNull();
      expect(voieCreateEvent.voieId).toEqual(voieId);

      const numeroResponse = await request(app.getHttpServer())
        .post(`/voies/${voieId}/numeros`)
        .send({
          numero: 1,
          positions: [createPositions([8, 42])],
        })
        .set('authorization', `Bearer ${token}`)
        .expect(201);
      const numeroId = numeroResponse.body.id;

      const numeroCreateEvent = await eventsRepository.findOneBy({
        balId,
        entityType: EventEntityTypeEnum.NUMERO,
        entityId: numeroId,
      });
      expect(numeroCreateEvent.parentEventId).toEqual(voieCreateEvent.id);
      expect(numeroCreateEvent.voieId).toEqual(voieId);

      const positionCreateEvent = await eventsRepository.findOneBy({
        balId,
        entityType: EventEntityTypeEnum.POSITION,
      });
      expect(positionCreateEvent.parentEventId).toEqual(numeroCreateEvent.id);
      expect(positionCreateEvent.voieId).toEqual(voieId);

      // The tree is VOIE -> NUMERO -> POSITION, confirmed via the read API.
      const response = await request(app.getHttpServer())
        .get(`/bases-locales/${balId}/events`)
        .set('authorization', `Bearer ${token}`)
        .expect(200);
      expect(response.body.count).toEqual(1);
      const [root] = response.body.results;
      expect(root.id).toEqual(voieCreateEvent.id);
      expect(root.childEvents).toHaveLength(1);
      expect(root.childEvents[0].id).toEqual(numeroCreateEvent.id);
      expect(root.childEvents[0].childEvents).toHaveLength(1);
      expect(root.childEvents[0].childEvents[0].id).toEqual(
        positionCreateEvent.id,
      );
    });

    it('updating a numero under a not-yet-synced voie preserves the nesting under the voie CREATE event', async () => {
      const balId = await createBal({ nom: 'bal', commune: '91400' });
      const voieResponse = await request(app.getHttpServer())
        .post(`/bases-locales/${balId}/voies`)
        .send({ nom: 'rue de la paix' })
        .set('authorization', `Bearer ${token}`)
        .expect(201);
      const voieId = voieResponse.body.id;

      const voieCreateEvent = await eventsRepository.findOneBy({
        balId,
        entityType: EventEntityTypeEnum.VOIE,
        entityId: voieId,
      });

      const numeroResponse = await request(app.getHttpServer())
        .post(`/voies/${voieId}/numeros`)
        .send({ numero: 1, positions: [createPositions([8, 42])] })
        .set('authorization', `Bearer ${token}`)
        .expect(201);
      const numeroId = numeroResponse.body.id;

      await request(app.getHttpServer())
        .put(`/numeros/${numeroId}`)
        .send({ numero: 2 })
        .set('authorization', `Bearer ${token}`)
        .expect(200);

      const numeroEvent = await eventsRepository.findOneBy({
        balId,
        entityType: EventEntityTypeEnum.NUMERO,
        entityId: numeroId,
      });
      // Fused CREATE+UPDATE stays a CREATE (only `after` moves forward) — the
      // parent set at creation time must survive this update untouched,
      // confirming the EventService.fuse() fix.
      expect(numeroEvent.action).toEqual(EventActionEnum.CREATE);
      expect(numeroEvent.parentEventId).toEqual(voieCreateEvent.id);
    });

    it('creating a numero under an already-synced voie does not nest it', async () => {
      const balId = await createBal({ nom: 'bal', commune: '91400' });
      const voieResponse = await request(app.getHttpServer())
        .post(`/bases-locales/${balId}/voies`)
        .send({ nom: 'rue de la paix' })
        .set('authorization', `Bearer ${token}`)
        .expect(201);
      const voieId = voieResponse.body.id;

      await eventsRepository.update(
        { balId, entityType: EventEntityTypeEnum.VOIE, entityId: voieId },
        { isSyncedWithRevision: 'fixture-revision-id' },
      );

      const numeroResponse = await request(app.getHttpServer())
        .post(`/voies/${voieId}/numeros`)
        .send({ numero: 1, positions: [createPositions([8, 42])] })
        .set('authorization', `Bearer ${token}`)
        .expect(201);
      const numeroId = numeroResponse.body.id;

      const numeroEvent = await eventsRepository.findOneBy({
        balId,
        entityType: EventEntityTypeEnum.NUMERO,
        entityId: numeroId,
      });
      expect(numeroEvent.parentEventId).toBeNull();
    });
  });

  describe('numero <-> toponyme junction events (e2e)', () => {
    it('creating a numero with a toponymeId emits a TOPONYME UPDATE event, and the NUMERO event carries no toponymeId', async () => {
      const balId = await createBal({ nom: 'bal', commune: '91400' });
      const voieId = await createVoie(balId, { nom: 'rue de la paix' });
      const toponymeId = await createToponyme(balId, {
        nom: 'place du marché',
      });

      const numeroResponse = await request(app.getHttpServer())
        .post(`/voies/${voieId}/numeros`)
        .send({
          numero: 1,
          toponymeId,
          positions: [createPositions([8, 42])],
        })
        .set('authorization', `Bearer ${token}`)
        .expect(201);
      const numeroId = numeroResponse.body.id;

      const numeroEvent = await eventsRepository.findOneBy({
        balId,
        entityType: EventEntityTypeEnum.NUMERO,
        entityId: numeroId,
      });
      expect(numeroEvent.action).toEqual(EventActionEnum.CREATE);
      expect(numeroEvent.payloadAfter).not.toHaveProperty('toponymeId');

      const toponymeEvent = await eventsRepository.findOneBy({
        balId,
        entityType: EventEntityTypeEnum.TOPONYME,
        entityId: toponymeId,
      });
      expect(toponymeEvent.action).toEqual(EventActionEnum.UPDATE);
      expect(numeroIdsOf(toponymeEvent.payloadBefore)).toEqual([]);
      expect(numeroIdsOf(toponymeEvent.payloadAfter)).toEqual([numeroId]);
    });

    it("changing only a numero's toponymeId emits no NUMERO event, only TOPONYME junction events", async () => {
      const balId = await createBal({ nom: 'bal', commune: '91400' });
      const voieId = await createVoie(balId, { nom: 'rue de la paix' });
      const toponymeIdA = await createToponyme(balId, { nom: 'place A' });
      const toponymeIdB = await createToponyme(balId, { nom: 'place B' });
      const numeroId = await createNumero(balId, voieId, {
        numero: 1,
        toponymeId: toponymeIdA,
      });

      await request(app.getHttpServer())
        .put(`/numeros/${numeroId}`)
        .send({ numero: 1, toponymeId: toponymeIdB })
        .set('authorization', `Bearer ${token}`)
        .expect(200);

      const numeroEvents = await eventsRepository.find({
        where: { balId, entityType: EventEntityTypeEnum.NUMERO },
      });
      expect(numeroEvents).toHaveLength(0);

      const toponymeEventA = await eventsRepository.findOneBy({
        balId,
        entityType: EventEntityTypeEnum.TOPONYME,
        entityId: toponymeIdA,
      });
      expect(numeroIdsOf(toponymeEventA.payloadBefore)).toEqual([numeroId]);
      expect(numeroIdsOf(toponymeEventA.payloadAfter)).toEqual([]);

      const toponymeEventB = await eventsRepository.findOneBy({
        balId,
        entityType: EventEntityTypeEnum.TOPONYME,
        entityId: toponymeIdB,
      });
      expect(numeroIdsOf(toponymeEventB.payloadBefore)).toEqual([]);
      expect(numeroIdsOf(toponymeEventB.payloadAfter)).toEqual([numeroId]);
    });

    it('changing toponymeId together with a real field emits both a NUMERO UPDATE and a TOPONYME junction event', async () => {
      const balId = await createBal({ nom: 'bal', commune: '91400' });
      const voieId = await createVoie(balId, { nom: 'rue de la paix' });
      const toponymeId = await createToponyme(balId, {
        nom: 'place du marché',
      });
      const numeroId = await createNumero(balId, voieId, { numero: 1 });

      await request(app.getHttpServer())
        .put(`/numeros/${numeroId}`)
        .send({ numero: 2, toponymeId })
        .set('authorization', `Bearer ${token}`)
        .expect(200);

      const numeroEvents = await eventsRepository.find({
        where: { balId, entityType: EventEntityTypeEnum.NUMERO },
      });
      expect(numeroEvents).toHaveLength(1);
      expect(numeroEvents[0].payloadAfter).not.toHaveProperty('toponymeId');
      expect((numeroEvents[0].payloadAfter as SerializedNumero).numero).toEqual(
        2,
      );

      const toponymeEvent = await eventsRepository.findOneBy({
        balId,
        entityType: EventEntityTypeEnum.TOPONYME,
        entityId: toponymeId,
      });
      expect(numeroIdsOf(toponymeEvent.payloadAfter)).toEqual([numeroId]);
    });

    it('deleting a numero attached to a toponyme detaches it from numeroIds', async () => {
      const balId = await createBal({ nom: 'bal', commune: '91400' });
      const voieId = await createVoie(balId, { nom: 'rue de la paix' });
      const toponymeId = await createToponyme(balId, {
        nom: 'place du marché',
      });
      const numeroId = await createNumero(balId, voieId, {
        numero: 1,
        toponymeId,
      });

      await request(app.getHttpServer())
        .delete(`/numeros/${numeroId}`)
        .set('authorization', `Bearer ${token}`)
        .expect(204);

      const numeroEvent = await eventsRepository.findOneBy({
        balId,
        entityType: EventEntityTypeEnum.NUMERO,
        entityId: numeroId,
      });
      expect(numeroEvent.action).toEqual(EventActionEnum.DELETE);

      const toponymeEvent = await eventsRepository.findOneBy({
        balId,
        entityType: EventEntityTypeEnum.TOPONYME,
        entityId: toponymeId,
      });
      expect(numeroIdsOf(toponymeEvent.payloadBefore)).toEqual([numeroId]);
      expect(numeroIdsOf(toponymeEvent.payloadAfter)).toEqual([]);
    });

    it('attaching then detaching a numero to/from the same toponyme before publication cancels the junction event', async () => {
      const balId = await createBal({ nom: 'bal', commune: '91400' });
      const voieId = await createVoie(balId, { nom: 'rue de la paix' });
      const toponymeId = await createToponyme(balId, {
        nom: 'place du marché',
      });
      const numeroId = await createNumero(balId, voieId, { numero: 1 });

      await request(app.getHttpServer())
        .put(`/numeros/${numeroId}`)
        .send({ numero: 1, toponymeId })
        .set('authorization', `Bearer ${token}`)
        .expect(200);

      let toponymeEvents = await eventsRepository.find({
        where: { balId, entityType: EventEntityTypeEnum.TOPONYME },
      });
      expect(toponymeEvents).toHaveLength(1);

      await request(app.getHttpServer())
        .put(`/numeros/${numeroId}`)
        .send({ numero: 1, toponymeId: null })
        .set('authorization', `Bearer ${token}`)
        .expect(200);

      toponymeEvents = await eventsRepository.find({
        where: { balId, entityType: EventEntityTypeEnum.TOPONYME },
      });
      expect(toponymeEvents).toHaveLength(0);

      const numeroEvents = await eventsRepository.find({
        where: { balId, entityType: EventEntityTypeEnum.NUMERO },
      });
      expect(numeroEvents).toHaveLength(0);
    });

    it('batch-updating several numeros to the same new toponyme emits a single TOPONYME UPDATE event for it', async () => {
      const balId = await createBal({ nom: 'bal', commune: '91400' });
      const voieId = await createVoie(balId, { nom: 'rue de la paix' });
      const toponymeId = await createToponyme(balId, {
        nom: 'place du marché',
      });
      const numeroId1 = await createNumero(balId, voieId, { numero: 1 });
      const numeroId2 = await createNumero(balId, voieId, { numero: 2 });

      await request(app.getHttpServer())
        .put(`/bases-locales/${balId}/numeros/batch`)
        .send({
          numerosIds: [numeroId1, numeroId2],
          changes: { toponymeId },
        })
        .set('authorization', `Bearer ${token}`)
        .expect(200);

      const toponymeEvents = await eventsRepository.find({
        where: { balId, entityType: EventEntityTypeEnum.TOPONYME },
      });
      expect(toponymeEvents).toHaveLength(1);
      expect(numeroIdsOf(toponymeEvents[0].payloadBefore)).toEqual([]);
      expect(numeroIdsOf(toponymeEvents[0].payloadAfter).sort()).toEqual(
        [numeroId1, numeroId2].sort(),
      );
    });

    it('batch-deleting several numeros attached to the same toponyme emits a single TOPONYME UPDATE event detaching all of them', async () => {
      const balId = await createBal({ nom: 'bal', commune: '91400' });
      const voieId = await createVoie(balId, { nom: 'rue de la paix' });
      const toponymeId = await createToponyme(balId, {
        nom: 'place du marché',
      });
      const numeroId1 = await createNumero(balId, voieId, {
        numero: 1,
        toponymeId,
      });
      const numeroId2 = await createNumero(balId, voieId, {
        numero: 2,
        toponymeId,
      });

      const deleteBatch: DeleteBatchNumeroDTO = {
        numerosIds: [numeroId1, numeroId2],
      };
      await request(app.getHttpServer())
        .delete(`/bases-locales/${balId}/numeros/batch`)
        .send(deleteBatch)
        .set('authorization', `Bearer ${token}`)
        .expect(204);

      const toponymeEvents = await eventsRepository.find({
        where: { balId, entityType: EventEntityTypeEnum.TOPONYME },
      });
      expect(toponymeEvents).toHaveLength(1);
      expect(numeroIdsOf(toponymeEvents[0].payloadBefore).sort()).toEqual(
        [numeroId1, numeroId2].sort(),
      );
      expect(numeroIdsOf(toponymeEvents[0].payloadAfter)).toEqual([]);
    });

    it('deleting a voie whose numeros are attached to the same toponyme emits a single TOPONYME UPDATE event detaching all of them', async () => {
      const balId = await createBal({ nom: 'bal', commune: '91400' });
      const voieId = await createVoie(balId, { nom: 'rue de la paix' });
      const toponymeId = await createToponyme(balId, {
        nom: 'place du marché',
      });
      const numeroId1 = await createNumero(balId, voieId, {
        numero: 1,
        toponymeId,
      });
      const numeroId2 = await createNumero(balId, voieId, {
        numero: 2,
        toponymeId,
      });

      await request(app.getHttpServer())
        .delete(`/voies/${voieId}`)
        .set('authorization', `Bearer ${token}`)
        .expect(204);

      const toponymeEvents = await eventsRepository.find({
        where: { balId, entityType: EventEntityTypeEnum.TOPONYME },
      });
      expect(toponymeEvents).toHaveLength(1);
      expect(numeroIdsOf(toponymeEvents[0].payloadBefore).sort()).toEqual(
        [numeroId1, numeroId2].sort(),
      );
      expect(numeroIdsOf(toponymeEvents[0].payloadAfter)).toEqual([]);
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

    it('GET .../events/synced returns only the events synced with the given revision', async () => {
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
        { isSyncedWithRevision: 'fixture-revision-id' },
      );

      // The pending-events route only ever returns still-unsynced roots —
      // the freshly-synced VOIE event is now excluded from it.
      const pendingResponse = await request(app.getHttpServer())
        .get(`/bases-locales/${balId}/events`)
        .set('authorization', `Bearer ${token}`)
        .expect(200);
      expect(pendingResponse.body.count).toEqual(1);
      expect(pendingResponse.body.results[0].entityType).toEqual(
        EventEntityTypeEnum.NUMERO,
      );
      expect(pendingResponse.body.results[0].childEvents).toHaveLength(1);

      const syncedResponse = await request(app.getHttpServer())
        .get(
          `/bases-locales/${balId}/events/synced?revisionId=fixture-revision-id`,
        )
        .set('authorization', `Bearer ${token}`)
        .expect(200);
      expect(syncedResponse.body.count).toEqual(1);
      expect(syncedResponse.body.results[0].id).toEqual(voieRootEvent.id);

      // A different (unknown) revision id matches nothing.
      const otherRevisionResponse = await request(app.getHttpServer())
        .get(`/bases-locales/${balId}/events/synced?revisionId=other-revision`)
        .set('authorization', `Bearer ${token}`)
        .expect(200);
      expect(otherRevisionResponse.body.count).toEqual(0);
    });

    it('GET .../events/synced requires a revisionId', async () => {
      const balId = await createBal({ nom: 'bal', commune: '91400' });

      await request(app.getHttpServer())
        .get(`/bases-locales/${balId}/events/synced`)
        .set('authorization', `Bearer ${token}`)
        .expect(400);
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

  describe('EventService.findEventsWithDescendants / updateEventSynced (ignoreEvents rollback)', () => {
    it('findEventsWithDescendants returns the given events and their full descendant subtree', async () => {
      const balId = await createBal({ nom: 'bal', commune: '91400' });
      const voieResponse = await request(app.getHttpServer())
        .post(`/bases-locales/${balId}/voies`)
        .send({ nom: 'rue de la paix' })
        .set('authorization', `Bearer ${token}`)
        .expect(201);
      const voieId = voieResponse.body.id;

      await request(app.getHttpServer())
        .post(`/voies/${voieId}/numeros`)
        .send({ numero: 1, positions: [createPositions([8, 42])] })
        .set('authorization', `Bearer ${token}`)
        .expect(201);

      const voieRootEvent = await eventsRepository.findOneBy({
        balId,
        entityType: EventEntityTypeEnum.VOIE,
      });

      const descendants = await eventService.findEventsWithDescendants([
        voieRootEvent.id,
      ]);

      expect(descendants.map((e) => e.entityType).sort()).toEqual(
        [
          EventEntityTypeEnum.VOIE,
          EventEntityTypeEnum.NUMERO,
          EventEntityTypeEnum.POSITION,
        ].sort(),
      );
    });

    it('findEventsWithDescendants returns nothing for an empty list', async () => {
      const descendants = await eventService.findEventsWithDescendants([]);
      expect(descendants).toEqual([]);
    });

    it('updateEventSynced leaves the given (and their descendant) events pending while marking the rest with the revision id', async () => {
      const balId = await createBal({ nom: 'bal', commune: '91400' });
      const voieResponse = await request(app.getHttpServer())
        .post(`/bases-locales/${balId}/voies`)
        .send({ nom: 'rue de la paix' })
        .set('authorization', `Bearer ${token}`)
        .expect(201);
      const voieId = voieResponse.body.id;

      await request(app.getHttpServer())
        .post(`/voies/${voieId}/numeros`)
        .send({ numero: 1, positions: [createPositions([8, 42])] })
        .set('authorization', `Bearer ${token}`)
        .expect(201);

      const otherVoieId = await createVoie(balId, { nom: 'rue B' });
      await request(app.getHttpServer())
        .put(`/voies/${otherVoieId}`)
        .send({ nom: 'rue B modifiée' })
        .set('authorization', `Bearer ${token}`)
        .expect(200);

      const voieRootEvent = await eventsRepository.findOneBy({
        balId,
        entityType: EventEntityTypeEnum.VOIE,
        entityId: voieId,
      });
      const otherVoieEvent = await eventsRepository.findOneBy({
        balId,
        entityType: EventEntityTypeEnum.VOIE,
        entityId: otherVoieId,
      });

      const ignoredEvents = await eventService.findEventsWithDescendants([
        voieRootEvent.id,
      ]);
      expect(ignoredEvents).toHaveLength(3); // VOIE + NUMERO + POSITION

      await eventService.updateEventSynced(
        balId,
        'fixture-revision-id',
        ignoredEvents.map((e) => e.id),
      );

      const stillPending = await eventsRepository.find({
        where: { balId, isSyncedWithRevision: IsNull() },
      });
      expect(stillPending.map((e) => e.id).sort()).toEqual(
        ignoredEvents.map((e) => e.id).sort(),
      );

      const synced = await eventsRepository.findOneBy({
        id: otherVoieEvent.id,
      });
      expect(synced.isSyncedWithRevision).toEqual('fixture-revision-id');
    });

    it('updateEventSynced never overwrites an event already synced with an earlier revision', async () => {
      const balId = await createBal({ nom: 'bal', commune: '91400' });
      const voieResponse = await request(app.getHttpServer())
        .post(`/bases-locales/${balId}/voies`)
        .send({ nom: 'rue de la paix' })
        .set('authorization', `Bearer ${token}`)
        .expect(201);
      const voieId = voieResponse.body.id;

      const firstEvent = await eventsRepository.findOneBy({
        balId,
        entityType: EventEntityTypeEnum.VOIE,
      });
      await eventService.updateEventSynced(balId, 'revision-1');

      await request(app.getHttpServer())
        .put(`/voies/${voieId}`)
        .send({ nom: 'nouvelle rue' })
        .set('authorization', `Bearer ${token}`)
        .expect(200);

      await eventService.updateEventSynced(balId, 'revision-2');

      const afterFirst = await eventsRepository.findOneBy({
        id: firstEvent.id,
      });
      expect(afterFirst.isSyncedWithRevision).toEqual('revision-1');

      const secondEvent = await eventsRepository.findOneBy({
        balId,
        entityType: EventEntityTypeEnum.VOIE,
        id: Not(firstEvent.id),
      });
      expect(secondEvent.isSyncedWithRevision).toEqual('revision-2');
    });
  });

  describe('no-op updates do not emit events', () => {
    it('does not emit a VOIE event when the update payload matches the current state', async () => {
      const balId = await createBal({ nom: 'bal', commune: '91400' });
      const voieResponse = await request(app.getHttpServer())
        .post(`/bases-locales/${balId}/voies`)
        .send({ nom: 'rue de la paix' })
        .set('authorization', `Bearer ${token}`)
        .expect(201);
      const voieId = voieResponse.body.id;

      const countBefore = await eventsRepository.count({ where: { balId } });

      await request(app.getHttpServer())
        .put(`/voies/${voieId}`)
        .send({ nom: 'rue de la paix' })
        .set('authorization', `Bearer ${token}`)
        .expect(200);

      const countAfter = await eventsRepository.count({ where: { balId } });
      expect(countAfter).toEqual(countBefore);
    });

    it('does not emit any event when the numero update payload matches the current state (positions omitted)', async () => {
      const balId = await createBal({ nom: 'bal', commune: '91400' });
      const voieResponse = await request(app.getHttpServer())
        .post(`/bases-locales/${balId}/voies`)
        .send({ nom: 'rue de la paix' })
        .set('authorization', `Bearer ${token}`)
        .expect(201);
      const voieId = voieResponse.body.id;

      const numeroResponse = await request(app.getHttpServer())
        .post(`/voies/${voieId}/numeros`)
        .send({ numero: 1, positions: [createPositions([8, 42])] })
        .set('authorization', `Bearer ${token}`)
        .expect(201);
      const numeroId = numeroResponse.body.id;

      const countBefore = await eventsRepository.count({ where: { balId } });

      // No `positions` key sent at all — the existing ones are left
      // untouched.
      await request(app.getHttpServer())
        .put(`/numeros/${numeroId}`)
        .send({ numero: 1 })
        .set('authorization', `Bearer ${token}`)
        .expect(200);

      const countAfter = await eventsRepository.count({ where: { balId } });
      expect(countAfter).toEqual(countBefore);
    });

    it('does not emit any event when the numero update payload matches the current state, positions resent identically', async () => {
      const balId = await createBal({ nom: 'bal', commune: '91400' });
      const voieResponse = await request(app.getHttpServer())
        .post(`/bases-locales/${balId}/voies`)
        .send({ nom: 'rue de la paix' })
        .set('authorization', `Bearer ${token}`)
        .expect(201);
      const voieId = voieResponse.body.id;

      const numeroResponse = await request(app.getHttpServer())
        .post(`/voies/${voieId}/numeros`)
        .send({ numero: 1, positions: [createPositions([8, 42])] })
        .set('authorization', `Bearer ${token}`)
        .expect(201);
      const numeroId = numeroResponse.body.id;
      const numeroCreated = await getTypeormRepository().numeros.findOneBy({
        id: numeroId,
      });
      const [position] = numeroCreated.positions;

      const countBefore = await eventsRepository.count({ where: { balId } });

      // The position's own id is resent, unchanged (now that `Position.id`
      // survives the update route's `ValidationPipe({ whitelist: true })`,
      // it's correctly matched and updated in place instead of being
      // deleted and recreated under a fresh id).
      await request(app.getHttpServer())
        .put(`/numeros/${numeroId}`)
        .send({
          numero: 1,
          positions: [
            {
              id: position.id,
              type: position.type,
              source: position.source,
              point: position.point,
            },
          ],
        })
        .set('authorization', `Bearer ${token}`)
        .expect(200);

      const countAfter = await eventsRepository.count({ where: { balId } });
      expect(countAfter).toEqual(countBefore);

      const numeroAfter = await getTypeormRepository().numeros.findOneBy({
        id: numeroId,
      });
      expect(numeroAfter.positions).toHaveLength(1);
      expect(numeroAfter.positions[0].id).toEqual(position.id);
    });

    it('reuses the pending NUMERO CREATE event as parent when only its positions change', async () => {
      const balId = await createBal({ nom: 'bal', commune: '91400' });
      const voieResponse = await request(app.getHttpServer())
        .post(`/bases-locales/${balId}/voies`)
        .send({ nom: 'rue de la paix' })
        .set('authorization', `Bearer ${token}`)
        .expect(201);
      const voieId = voieResponse.body.id;

      const numeroResponse = await request(app.getHttpServer())
        .post(`/voies/${voieId}/numeros`)
        .send({ numero: 1, positions: [createPositions([8, 42])] })
        .set('authorization', `Bearer ${token}`)
        .expect(201);
      const numeroId = numeroResponse.body.id;

      await request(app.getHttpServer())
        .put(`/numeros/${numeroId}`)
        .send({ numero: 1, positions: [createPositions([9, 43])] })
        .set('authorization', `Bearer ${token}`)
        .expect(200);

      const numeroEvents = await eventsRepository.find({
        where: { balId, entityType: EventEntityTypeEnum.NUMERO },
      });
      // Only the initial CREATE event exists — no separate UPDATE emitted,
      // since the numero's own fields never changed (fusing keeps it a
      // CREATE, only `after` moves forward).
      expect(numeroEvents).toHaveLength(1);
      expect(numeroEvents[0].action).toEqual(EventActionEnum.CREATE);

      const positionEvents = await eventsRepository.find({
        where: { balId, entityType: EventEntityTypeEnum.POSITION },
      });
      // The old position's still-unsynced CREATE event cancels out against
      // its DELETE (never published), leaving only the new position's
      // CREATE — but it must not be a root: a POSITION event is always
      // parented, here reusing the numero's own pending CREATE event.
      expect(positionEvents).toHaveLength(1);
      expect(positionEvents[0].action).toEqual(EventActionEnum.CREATE);
      expect(positionEvents[0].parentEventId).toEqual(numeroEvents[0].id);
    });

    it('does not emit a TOPONYME event when the update payload matches the current state', async () => {
      const balId = await createBal({ nom: 'bal', commune: '91400' });
      const toponymeResponse = await request(app.getHttpServer())
        .post(`/bases-locales/${balId}/toponymes`)
        .send({ nom: 'place du marché' })
        .set('authorization', `Bearer ${token}`)
        .expect(201);
      const toponymeId = toponymeResponse.body.id;

      const countBefore = await eventsRepository.count({ where: { balId } });

      await request(app.getHttpServer())
        .put(`/toponymes/${toponymeId}`)
        .send({ nom: 'place du marché' })
        .set('authorization', `Bearer ${token}`)
        .expect(200);

      const countAfter = await eventsRepository.count({ where: { balId } });
      expect(countAfter).toEqual(countBefore);
    });
  });

  describe('an UPDATE round-trip back to the published state deletes the event', () => {
    it('deletes the VOIE UPDATE event once the nom is reverted', async () => {
      const balId = await createBal({ nom: 'bal', commune: '91400' });
      const voieId = await createVoie(balId, { nom: 'aaa' });

      await request(app.getHttpServer())
        .put(`/voies/${voieId}`)
        .send({ nom: 'bbb' })
        .set('authorization', `Bearer ${token}`)
        .expect(200);
      await request(app.getHttpServer())
        .put(`/voies/${voieId}`)
        .send({ nom: 'aaa' })
        .set('authorization', `Bearer ${token}`)
        .expect(200);

      const count = await eventsRepository.count({ where: { balId } });
      expect(count).toEqual(0);
    });

    it('deletes the NUMERO UPDATE event once the numero is reverted', async () => {
      const balId = await createBal({ nom: 'bal', commune: '91400' });
      const voieId = await createVoie(balId, { nom: 'rue de la paix' });
      const numeroId = await createNumero(balId, voieId, { numero: 1 });

      await request(app.getHttpServer())
        .put(`/numeros/${numeroId}`)
        .send({ numero: 2 })
        .set('authorization', `Bearer ${token}`)
        .expect(200);
      await request(app.getHttpServer())
        .put(`/numeros/${numeroId}`)
        .send({ numero: 1 })
        .set('authorization', `Bearer ${token}`)
        .expect(200);

      const count = await eventsRepository.count({ where: { balId } });
      expect(count).toEqual(0);
    });

    it('deletes the TOPONYME UPDATE event once the nom is reverted', async () => {
      const balId = await createBal({ nom: 'bal', commune: '91400' });
      const toponymeId = await createToponyme(balId, { nom: 'aaa' });

      await request(app.getHttpServer())
        .put(`/toponymes/${toponymeId}`)
        .send({ nom: 'bbb' })
        .set('authorization', `Bearer ${token}`)
        .expect(200);
      await request(app.getHttpServer())
        .put(`/toponymes/${toponymeId}`)
        .send({ nom: 'aaa' })
        .set('authorization', `Bearer ${token}`)
        .expect(200);

      const count = await eventsRepository.count({ where: { balId } });
      expect(count).toEqual(0);
    });

    it('deletes the POSITION UPDATE event once its point is reverted (numero)', async () => {
      const balId = await createBal({ nom: 'bal', commune: '91400' });
      const voieId = await createVoie(balId, { nom: 'rue de la paix' });
      const numeroId = await createNumero(balId, voieId, {
        numero: 1,
        positions: [createPositions([8, 42])],
      });
      const numeroCreated = await getTypeormRepository().numeros.findOneBy({
        id: numeroId,
      });
      const [position] = numeroCreated.positions;

      await request(app.getHttpServer())
        .put(`/numeros/${numeroId}`)
        .send({
          numero: 1,
          positions: [
            {
              id: position.id,
              type: position.type,
              source: position.source,
              point: { type: 'Point', coordinates: [9, 43] },
            },
          ],
        })
        .set('authorization', `Bearer ${token}`)
        .expect(200);
      await request(app.getHttpServer())
        .put(`/numeros/${numeroId}`)
        .send({
          numero: 1,
          positions: [
            {
              id: position.id,
              type: position.type,
              source: position.source,
              point: position.point,
            },
          ],
        })
        .set('authorization', `Bearer ${token}`)
        .expect(200);

      // The position's id stayed stable across both saves (no more
      // regeneration), so the second call's `fuse()` correctly recognizes
      // the round-trip and drops the event entirely.
      const count = await eventsRepository.count({ where: { balId } });
      expect(count).toEqual(0);

      const numeroAfter = await getTypeormRepository().numeros.findOneBy({
        id: numeroId,
      });
      expect(numeroAfter.positions[0].id).toEqual(position.id);
    });

    it('deletes the POSITION UPDATE event once its point is reverted (toponyme)', async () => {
      const balId = await createBal({ nom: 'bal', commune: '91400' });
      const toponymeId = await createToponyme(balId, {
        nom: 'place du marché',
        positions: [createPositions([8, 42])],
      });
      const toponymeCreated = await getTypeormRepository().toponymes.findOneBy({
        id: toponymeId,
      });
      const [position] = toponymeCreated.positions;

      await request(app.getHttpServer())
        .put(`/toponymes/${toponymeId}`)
        .send({
          positions: [
            {
              id: position.id,
              type: position.type,
              source: position.source,
              point: { type: 'Point', coordinates: [9, 43] },
            },
          ],
        })
        .set('authorization', `Bearer ${token}`)
        .expect(200);
      await request(app.getHttpServer())
        .put(`/toponymes/${toponymeId}`)
        .send({
          positions: [
            {
              id: position.id,
              type: position.type,
              source: position.source,
              point: position.point,
            },
          ],
        })
        .set('authorization', `Bearer ${token}`)
        .expect(200);

      const count = await eventsRepository.count({ where: { balId } });
      expect(count).toEqual(0);
    });
  });
});
