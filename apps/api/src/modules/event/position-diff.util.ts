import { Position } from '@/shared/entities/position.entity';
import {
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
export async function emitPositionDiffEvents(
  eventService: EventService,
  ctx: RegisterEventContext,
  before: Position[],
  after: Position[],
): Promise<void> {
  const beforeById = new Map((before ?? []).map((p) => [p.id, p]));
  const afterById = new Map((after ?? []).map((p) => [p.id, p]));

  for (const position of after ?? []) {
    const previous = beforeById.get(position.id);
    if (!previous) {
      await eventService.register(ctx, {
        entityType: EventEntityTypeEnum.POSITION,
        entityId: position.id,
        action: EventActionEnum.CREATE,
        after: serializePosition(position),
      });
      continue;
    }
    const previousPayload = serializePosition(previous);
    const currentPayload = serializePosition(position);
    if (!payloadsAreEqual(previousPayload, currentPayload)) {
      await eventService.register(ctx, {
        entityType: EventEntityTypeEnum.POSITION,
        entityId: position.id,
        action: EventActionEnum.UPDATE,
        before: previousPayload,
        after: currentPayload,
      });
    }
  }

  for (const position of before ?? []) {
    if (!afterById.has(position.id)) {
      await eventService.register(ctx, {
        entityType: EventEntityTypeEnum.POSITION,
        entityId: position.id,
        action: EventActionEnum.DELETE,
        before: serializePosition(position),
      });
    }
  }
}
