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
          after: { numero: 1 },
        },
      );

      expect(event.action).toEqual(EventActionEnum.CREATE);
      expect(event.payloadBefore).toBeNull();
      expect(event.payloadAfter).toEqual({ numero: 1 });
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
          before: { numero: 1 },
          after: { numero: 2 },
        },
      );

      expect(event.action).toEqual(EventActionEnum.UPDATE);
      expect(event.payloadBefore).toEqual({ numero: 1 });
      expect(event.payloadAfter).toEqual({ numero: 2 });
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
          before: { numero: 1 },
        },
      );

      expect(event.action).toEqual(EventActionEnum.DELETE);
      expect(event.payloadBefore).toEqual({ numero: 1 });
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
          after: { numero: 1 },
        },
      );
      const event = await eventService.register(
        { balId },
        {
          entityType: EventEntityTypeEnum.NUMERO,
          entityId,
          action: EventActionEnum.UPDATE,
          before: { numero: 1 },
          after: { numero: 2 },
        },
      );

      expect(event.action).toEqual(EventActionEnum.CREATE);
      expect(event.payloadBefore).toBeNull();
      expect(event.payloadAfter).toEqual({ numero: 2 });

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
          before: { numero: 1 },
          after: { numero: 2 },
        },
      );
      const event = await eventService.register(
        { balId },
        {
          entityType: EventEntityTypeEnum.NUMERO,
          entityId,
          action: EventActionEnum.UPDATE,
          before: { numero: 2 },
          after: { numero: 3 },
        },
      );

      expect(event.action).toEqual(EventActionEnum.UPDATE);
      expect(event.payloadBefore).toEqual({ numero: 1 });
      expect(event.payloadAfter).toEqual({ numero: 3 });

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
          after: { numero: 1 },
        },
      );
      const result = await eventService.register(
        { balId },
        {
          entityType: EventEntityTypeEnum.NUMERO,
          entityId,
          action: EventActionEnum.DELETE,
          before: { numero: 1 },
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
          before: { numero: 1 },
          after: { numero: 2 },
        },
      );
      const event = await eventService.register(
        { balId },
        {
          entityType: EventEntityTypeEnum.NUMERO,
          entityId,
          action: EventActionEnum.DELETE,
          before: { numero: 2 },
        },
      );

      expect(event.action).toEqual(EventActionEnum.DELETE);
      expect(event.payloadBefore).toEqual({ numero: 1 });
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
          before: { numero: 1 },
        },
      );
      const event = await eventService.register(
        { balId },
        {
          entityType: EventEntityTypeEnum.NUMERO,
          entityId,
          action: EventActionEnum.CREATE,
          after: { numero: 2 },
        },
      );

      expect(event.action).toEqual(EventActionEnum.UPDATE);
      expect(event.payloadBefore).toEqual({ numero: 1 });
      expect(event.payloadAfter).toEqual({ numero: 2 });

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
          before: { numero: 1 },
        },
      );

      await expect(
        eventService.register(
          { balId },
          {
            entityType: EventEntityTypeEnum.NUMERO,
            entityId,
            action: EventActionEnum.DELETE,
            before: { numero: 1 },
          },
        ),
      ).rejects.toThrow();
    });

    it('a composite covered entity is not fused with: a new independent event is created', async () => {
      const balId = await createBal({ nom: 'bal', commune: '91400' });
      const entityId = newEntityId();

      await eventService.registerComposite(
        { balId },
        {
          action: EventActionEnum.MERGE_VOIES,
          before: { voies: [entityId] },
          after: { voie: entityId },
          entities: [{ entityType: EventEntityTypeEnum.VOIE, entityId }],
        },
      );

      const event = await eventService.register(
        { balId },
        {
          entityType: EventEntityTypeEnum.VOIE,
          entityId,
          action: EventActionEnum.UPDATE,
          before: { nom: 'a' },
          after: { nom: 'b' },
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
      expect(compositeRoot.payloadBefore).toEqual({ voies: [entityId] });
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
          after: { numero: 1 },
        },
      );
      await eventService.register(
        { balId },
        {
          entityType: EventEntityTypeEnum.NUMERO,
          entityId,
          action: EventActionEnum.UPDATE,
          before: { numero: 1 },
          after: { numero: 2 },
        },
      );
      await eventService.register(
        { balId },
        {
          entityType: EventEntityTypeEnum.NUMERO,
          entityId,
          action: EventActionEnum.UPDATE,
          before: { numero: 2 },
          after: { numero: 3 },
        },
      );
      const result = await eventService.register(
        { balId },
        {
          entityType: EventEntityTypeEnum.NUMERO,
          entityId,
          action: EventActionEnum.DELETE,
          before: { numero: 3 },
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
          before: { numero: 1 },
          after: { numero: 2 },
        },
      );
      await eventService.register(
        { balId },
        {
          entityType: EventEntityTypeEnum.NUMERO,
          entityId,
          action: EventActionEnum.DELETE,
          before: { numero: 2 },
        },
      );

      const events = await eventsRepository.find({ where: { entityId } });
      expect(events).toHaveLength(1);
      expect(events[0].action).toEqual(EventActionEnum.DELETE);
      expect(events[0].payloadBefore).toEqual({ numero: 1 });
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
          before: { numero: 1 },
          after: { numero: 2 },
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
          before: { numero: 2 },
          after: { numero: 3 },
        },
      );

      expect(newEvent.id).not.toEqual(syncedEvent.id);
      expect(newEvent.payloadBefore).toEqual({ numero: 2 });
      expect(newEvent.payloadAfter).toEqual({ numero: 3 });

      const oldEvent = await eventsRepository.findOneBy({
        id: syncedEvent.id,
      });
      expect(oldEvent.payloadBefore).toEqual({ numero: 1 });
      expect(oldEvent.payloadAfter).toEqual({ numero: 2 });
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
});
