import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, IsNull, Repository } from 'typeorm';

import {
  Event,
  EventActionEnum,
  EventEntityTypeEnum,
} from '@/shared/entities/event.entity';
import {
  CompositeEventPayload,
  EntityEventPayload,
} from '@/shared/entities/event_payload.type';

export interface RegisterEventContext {
  balId: string;
  parentEventId?: string;
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

@Injectable()
export class EventService {
  constructor(
    @InjectRepository(Event)
    private eventsRepository: Repository<Event>,
  ) {}

  // Lists root events (parentEventId IS NULL, including composite roots) for
  // a BAL, most recent first, with their child events attached. Pagination
  // applies to roots only — a root + its children counts as one page item.
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
      relations: { childEvents: true },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    // The `isSynced` filter also applies to the children loaded through the
    // relation (TypeORM can't filter a joined collection via `find()`, only
    // through QueryBuilder) — filtered/sorted in memory, still a single
    // round-trip to the DB overall.
    const results = roots.map((root) => ({
      ...root,
      childEvents: (root.childEvents ?? [])
        .filter(
          (child) => isSynced === undefined || child.isSynced === isSynced,
        )
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()),
    }));

    return { count, results };
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

  private async insert(
    repo: Repository<Event>,
    ctx: RegisterEventContext,
    params: RegisterEventParams,
  ): Promise<Event> {
    return repo.save(
      repo.create({
        balId: ctx.balId,
        parentEventId: ctx.parentEventId ?? null,
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
        current.parentEventId = ctx.parentEventId ?? null;
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
        // Whether current is CREATE or UPDATE, only `after` moves forward;
        // a CREATE-origin event stays a CREATE, `before` never changes.
        current.payloadAfter = params.after ?? null;
        current.parentEventId = ctx.parentEventId ?? null;
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
          await repo.delete({ id: current.id });
          return null;
        }
        // current.action === UPDATE: becomes a DELETE, keeping the
        // original `before` of that UPDATE.
        current.action = EventActionEnum.DELETE;
        current.payloadAfter = null;
        current.parentEventId = ctx.parentEventId ?? null;
        return repo.save(current);
      }
    }
  }
}
