import { Position } from '@/shared/entities/position.entity';
import { SerializedPosition } from '@/shared/entities/event_payload.type';

export function serializePosition(position: Position): SerializedPosition {
  return {
    id: position.id,
    toponymeId: position.toponymeId ?? null,
    numeroId: position.numeroId ?? null,
    type: position.type,
    source: position.source ?? null,
    rank: position.rank,
    point: position.point,
  };
}
