import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, In, IsNull, Repository } from 'typeorm';

import {
  Event,
  EventActionEnum,
  EventEntityTypeEnum,
} from '@/shared/entities/event.entity';
import {
  CompositeEventPayload,
  EntityEventPayload,
} from '@/shared/entities/event_payload.type';
import { payloadsAreEqual } from '@/modules/event/payload-diff.util';

export interface RegisterEventContext {
  balId: string;
  parentEventId?: string;
  voieId?: string;
}

export interface RegisterEventParams {
  entityType: EventEntityTypeEnum;
  entityId: string;
  action: EventActionEnum;
  before?: EntityEventPayload | null;
  after?: EntityEventPayload | null;
}

export interface RegisterCompositeEventParams {
  action: EventActionEnum;
  before: CompositeEventPayload;
  after: CompositeEventPayload;
  entities: { entityType: EventEntityTypeEnum; entityId: string }[];
}

export interface FindRootEventsByBalParams {
  isSynced?: boolean;
  limit: number;
  offset: number;
}

export interface ReparentOrphanedNumerosParams {
  balId: string;
  voieId: string;
  newRootId: string;
}

// Applies the `isSynced` filter (also meant for children, since TypeORM
// can't filter a joined collection via `find()`, only through QueryBuilder)
// and a most-recent-first sort at every level of the tree, recursively.
// Bounded in practice by how deep `relations` was loaded (2 levels of
// `childEvents` today — VOIE/COMPOSITE root -> NUMERO -> POSITION, the only
// hierarchy in this domain), but works at any depth.
function sortAndFilterChildren(event: Event, isSynced?: boolean): Event {
  return {
    ...event,
    childEvents: (event.childEvents ?? [])
      .filter((child) => isSynced === undefined || child.isSynced === isSynced)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((child) => sortAndFilterChildren(child, isSynced)),
  };
}

@Injectable()
export class EventService {
  constructor(
    @InjectRepository(Event)
    private eventsRepository: Repository<Event>,
  ) {}

  // Lists root events (parentEventId IS NULL, including composite roots) for
  // a BAL, most recent first, with their full descendants attached (up to 2
  // levels: NUMERO children, and POSITION grandchildren). Pagination applies
  // to roots only — a root + its descendants counts as one page item.
  public async findRootEventsByBal(
    balId: string,
    { isSynced, limit, offset }: FindRootEventsByBalParams,
  ): Promise<{ count: number; results: Event[] }> {
    const where: FindOptionsWhere<Event> = {
      balId,
      parentEventId: IsNull(),
      ...(isSynced !== undefined && { isSynced }),
    };

    const count = await this.eventsRepository.count({ where });
    const roots = await this.eventsRepository.find({
      where,
      relations: { childEvents: { childEvents: true } },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    const results = roots.map((root) => sortAndFilterChildren(root, isSynced));

    return { count, results };
  }

  // Reparents under `newRootId` any root, non-synced NUMERO DELETE event
  // whose numero belonged to `voieId` before being deleted independently,
  // earlier and separately from this voie's own deletion (so it no longer
  // exists in the `numeros` table). Its own children (POSITION DELETE
  // events) already correctly point to it and are left untouched — the
  // resulting tree is VOIE -> NUMERO -> POSITION, never flattened.
  public async reparentOrphanedDeletedNumeros({
    balId,
    voieId,
    newRootId,
  }: ReparentOrphanedNumerosParams): Promise<void> {
    await this.eventsRepository.update(
      {
        balId,
        voieId,
        entityType: EventEntityTypeEnum.NUMERO,
        action: EventActionEnum.DELETE,
        isSynced: false,
        parentEventId: IsNull(),
      },
      { parentEventId: newRootId },
    );
  }

  // Repoints the given events' parent to `newParentId` — used once a
  // parent event's existence is only known after its would-be children
  // have already been registered (e.g. positions diffed before deciding
  // whether a NUMERO/TOPONYME UPDATE container is needed at all).
  public async reparentEvents(
    eventIds: string[],
    newParentId: string,
  ): Promise<void> {
    if (eventIds.length === 0) {
      return;
    }
    await this.eventsRepository.update(
      { id: In(eventIds) },
      { parentEventId: newParentId },
    );
  }

  // Returns the id of `voieId`'s own pending (unsynced) CREATE event, if
  // any — used to nest a numero's very first event under it, so rolling
  // back the voie's creation cannot leave numeros created under it dangling.
  public async findUnsyncedVoieCreateEventId(
    voieId: string,
  ): Promise<string | undefined> {
    const voieCreateEvent = await this.eventsRepository.findOneBy({
      entityType: EventEntityTypeEnum.VOIE,
      entityId: voieId,
      action: EventActionEnum.CREATE,
      isSynced: false,
    });
    return voieCreateEvent?.id;
  }

  // Registers a CREATE/UPDATE/DELETE action on a single entity, fusing it
  // with the entity's current unpublished event if there is one. Returns the
  // resulting event, or null when the fusion cancels it out entirely
  // (CREATE followed by DELETE before publication).
  public async register(
    ctx: RegisterEventContext,
    params: RegisterEventParams,
  ): Promise<Event | null> {
    return this.eventsRepository.manager.transaction(async (manager) => {
      const repo = manager.getRepository(Event);
      // `FOR UPDATE` cannot be combined with the outer join a `relations`
      // fetch of `parentEvent` would require, so the parent (if any) is
      // read as a separate, unlocked query right after.
      const current = await repo.findOne({
        where: {
          entityType: params.entityType,
          entityId: params.entityId,
          isSynced: false,
        },
        lock: { mode: 'pessimistic_write' },
      });

      if (!current) {
        return this.insert(repo, ctx, params);
      }

      // A composite event seals the state of the entities it covers: it is
      // never fused with. `current` is then just the composite's coverage
      // row for this entity (no payload of its own) — it is superseded by a
      // fresh independent event, which takes over its slot in the unique
      // "at most one unsynced event per entity" index. The composite root
      // itself is untouched and keeps its aggregated history.
      const parent = current.parentEventId
        ? await repo.findOneBy({ id: current.parentEventId })
        : null;
      if (parent?.entityType === EventEntityTypeEnum.COMPOSITE) {
        await repo.delete({ id: current.id });
        return this.insert(repo, ctx, params);
      }

      return this.fuse(repo, ctx, current, params);
    });
  }

  // Registers a single composite event (MERGE_VOIES / CONVERT_VOIE_TO_TOPONYME)
  // covering several entities at once. No individual event is emitted for
  // the covered entities — any pending unsynced event on them is absorbed so
  // the "at most one unsynced event per entity" invariant keeps holding.
  public async registerComposite(
    ctx: { balId: string },
    params: RegisterCompositeEventParams,
  ): Promise<Event> {
    return this.eventsRepository.manager.transaction(async (manager) => {
      const repo = manager.getRepository(Event);

      for (const { entityType, entityId } of params.entities) {
        await repo.delete({ entityType, entityId, isSynced: false });
      }

      const root = await repo.save(
        repo.create({
          balId: ctx.balId,
          parentEventId: null,
          entityType: EventEntityTypeEnum.COMPOSITE,
          entityId: null,
          action: params.action,
          payloadBefore: params.before,
          payloadAfter: params.after,
        }),
      );

      const children = params.entities.map(({ entityType, entityId }) =>
        repo.create({
          balId: ctx.balId,
          parentEventId: root.id,
          entityType,
          entityId,
          action: params.action,
          payloadBefore: null,
          payloadAfter: null,
        }),
      );
      await repo.save(children);

      return root;
    });
  }

  // After an event is deleted (fused away entirely), its former parent may
  // now be an empty, purely-trivial container (before === after, created
  // only to hold that child — see NumeroService/ToponymeService update()).
  // Such a container carries no information of its own once it has no
  // children left, so it's cleaned up too, recursively (in case the
  // grandparent becomes empty as a result). A `CREATE` event's `before` is
  // always `null` and its `after` always real content, so this never
  // touches a legitimate CREATE — only UPDATE containers built purely as a
  // parent placeholder.
  private async cleanupEmptyTrivialParent(
    repo: Repository<Event>,
    parentEventId: string | null,
  ): Promise<void> {
    if (!parentEventId) {
      return;
    }
    const parent = await repo.findOneBy({ id: parentEventId });
    if (
      !parent ||
      !payloadsAreEqual(parent.payloadBefore, parent.payloadAfter)
    ) {
      return;
    }
    const hasOtherChildren = await repo.exists({
      where: { parentEventId: parent.id },
    });
    if (hasOtherChildren) {
      return;
    }
    const grandParentId = parent.parentEventId;
    await repo.delete({ id: parent.id });
    await this.cleanupEmptyTrivialParent(repo, grandParentId);
  }

  private async insert(
    repo: Repository<Event>,
    ctx: RegisterEventContext,
    params: RegisterEventParams,
  ): Promise<Event> {
    return repo.save(
      repo.create({
        balId: ctx.balId,
        parentEventId: ctx.parentEventId ?? null,
        voieId: ctx.voieId ?? null,
        entityType: params.entityType,
        entityId: params.entityId,
        action: params.action,
        payloadBefore:
          params.action === EventActionEnum.CREATE
            ? null
            : params.before ?? null,
        payloadAfter:
          params.action === EventActionEnum.DELETE
            ? null
            : params.after ?? null,
      }),
    );
  }

  private async fuse(
    repo: Repository<Event>,
    ctx: RegisterEventContext,
    current: Event,
    params: RegisterEventParams,
  ): Promise<Event | null> {
    switch (params.action) {
      case EventActionEnum.CREATE: {
        if (current.action !== EventActionEnum.DELETE) {
          // A CREATE can only be registered for an entity id that does not
          // exist yet in DB, so no unsynced CREATE/UPDATE event should
          // already be pending for it (the DB primary key would have
          // rejected the insert first).
          throw new Error(
            `Unexpected CREATE event for ${params.entityType}:${params.entityId} while an unsynced ${current.action} event is already pending`,
          );
        }
        // The entity was deleted, then a new one was created under the same
        // id (e.g. CSV re-import): from a publication standpoint this is a
        // single state change on that id — the last published state (the
        // DELETE's `before`) transitions directly to the new `after`.
        current.action = EventActionEnum.UPDATE;
        current.payloadAfter = params.after ?? null;
        current.voieId = ctx.voieId ?? null;
        // Only repoint the parent when the caller explicitly provides one —
        // otherwise a plain standalone update/delete call (no parentEventId
        // in its ctx) would silently wipe out a nesting established earlier
        // (e.g. a numero created under its voie's still-unsynced CREATE
        // event, see NumeroService.create()).
        if (ctx.parentEventId !== undefined) {
          current.parentEventId = ctx.parentEventId;
        }
        return repo.save(current);
      }

      case EventActionEnum.UPDATE: {
        if (current.action === EventActionEnum.DELETE) {
          // Cannot happen in practice: updating an id that was already
          // hard-deleted has no row to update. Handled defensively.
          throw new Error(
            `Unexpected UPDATE event for ${params.entityType}:${params.entityId} while an unsynced DELETE event is already pending`,
          );
        }
        if (
          current.action === EventActionEnum.UPDATE &&
          payloadsAreEqual(current.payloadBefore, params.after ?? null)
        ) {
          // The value is back to its originally-published state — nothing
          // left to publish for this entity, so the event would normally be
          // dropped entirely (pendant of the CREATE+DELETE cancellation
          // below). But if children still depend on it as their parent
          // (e.g. a NUMERO/TOPONYME UPDATE container holding a still-live
          // POSITION event), it must not vanish — a position event may
          // never end up orphaned.
          const hasChildren = await repo.exists({
            where: { parentEventId: current.id },
          });
          if (!hasChildren) {
            const formerParentId = current.parentEventId;
            await repo.delete({ id: current.id });
            await this.cleanupEmptyTrivialParent(repo, formerParentId);
            return null;
          }
        }
        // Whether current is CREATE or UPDATE, only `after` moves forward;
        // a CREATE-origin event stays a CREATE, `before` never changes.
        current.payloadAfter = params.after ?? null;
        current.voieId = ctx.voieId ?? null;
        // Only repoint the parent when the caller explicitly provides one —
        // otherwise a plain standalone update/delete call (no parentEventId
        // in its ctx) would silently wipe out a nesting established earlier
        // (e.g. a numero created under its voie's still-unsynced CREATE
        // event, see NumeroService.create()).
        if (ctx.parentEventId !== undefined) {
          current.parentEventId = ctx.parentEventId;
        }
        return repo.save(current);
      }

      case EventActionEnum.DELETE: {
        if (current.action === EventActionEnum.DELETE) {
          throw new Error(
            `Unexpected DELETE event for ${params.entityType}:${params.entityId} while an unsynced DELETE event is already pending`,
          );
        }
        if (current.action === EventActionEnum.CREATE) {
          // The entity never existed from a publication standpoint.
          const formerParentId = current.parentEventId;
          await repo.delete({ id: current.id });
          await this.cleanupEmptyTrivialParent(repo, formerParentId);
          return null;
        }
        // current.action === UPDATE: becomes a DELETE, keeping the
        // original `before` of that UPDATE.
        current.action = EventActionEnum.DELETE;
        current.payloadAfter = null;
        current.voieId = ctx.voieId ?? null;
        // Only repoint the parent when the caller explicitly provides one —
        // otherwise a plain standalone update/delete call (no parentEventId
        // in its ctx) would silently wipe out a nesting established earlier
        // (e.g. a numero created under its voie's still-unsynced CREATE
        // event, see NumeroService.create()).
        if (ctx.parentEventId !== undefined) {
          current.parentEventId = ctx.parentEventId;
        }
        return repo.save(current);
      }
    }
  }
}
