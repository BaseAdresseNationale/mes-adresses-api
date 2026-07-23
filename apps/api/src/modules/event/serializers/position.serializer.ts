import { Position } from '@/shared/entities/position.entity';

export function serializePosition(position: Position): Record<string, any> {
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
