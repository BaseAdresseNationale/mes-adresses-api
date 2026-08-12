import { Position } from '@/shared/entities/position.entity';
import {
  Event,
  EventActionEnum,
  EventEntityTypeEnum,
} from '@/shared/entities/event.entity';
import {
  EventService,
  RegisterEventContext,
} from '@/modules/event/event.service';
import { serializePosition } from '@/modules/event/serializers/position.serializer';
import { payloadsAreEqual } from '@/modules/event/payload-diff.util';

// Positions are still persisted implicitly through the parent Numero/Toponyme
// cascade save (no explicit PositionService) — this only diffs the loaded
// before/after arrays (matched by id) to emit the corresponding CREATE /
// UPDATE / DELETE events, without changing how positions are actually written.
//
// Returns the events that actually survived (register() can return null when
// a fusion cancels one out entirely) — callers use this to decide whether a
// parent NUMERO/TOPONYME event is needed at all, and to reparent these once
// that parent is known (a position event must never stay a root).
export async function emitPositionDiffEvents(
  eventService: EventService,
  ctx: RegisterEventContext,
  before: Position[],
  after: Position[],
): Promise<Event[]> {
  const beforeById = new Map((before ?? []).map((p) => [p.id, p]));
  const afterById = new Map((after ?? []).map((p) => [p.id, p]));
  const results: Event[] = [];

  for (const position of after ?? []) {
    const previous = beforeById.get(position.id);
    if (!previous) {
      const event = await eventService.register(ctx, {
        entityType: EventEntityTypeEnum.POSITION,
        entityId: position.id,
        action: EventActionEnum.CREATE,
        after: serializePosition(position),
      });
      if (event) {
        results.push(event);
      }
      continue;
    }
    const previousPayload = serializePosition(previous);
    const currentPayload = serializePosition(position);
    if (!payloadsAreEqual(previousPayload, currentPayload)) {
      const event = await eventService.register(ctx, {
        entityType: EventEntityTypeEnum.POSITION,
        entityId: position.id,
        action: EventActionEnum.UPDATE,
        before: previousPayload,
        after: currentPayload,
      });
      if (event) {
        results.push(event);
      }
    }
  }

  for (const position of before ?? []) {
    if (!afterById.has(position.id)) {
      const event = await eventService.register(ctx, {
        entityType: EventEntityTypeEnum.POSITION,
        entityId: position.id,
        action: EventActionEnum.DELETE,
        before: serializePosition(position),
      });
      if (event) {
        results.push(event);
      }
    }
  }

  return results;
}
