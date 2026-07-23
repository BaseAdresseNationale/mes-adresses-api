import { ApiProperty } from '@nestjs/swagger';
import { Event } from '@/shared/entities/event.entity';

// Child events are always leaves (parentEventId always points to the root
// of a business operation, never chained) — no nested EventDTO needed here.
export class EventDTO extends Event {
  @ApiProperty({ type: () => Event, isArray: true })
  childEvents: Event[];
}
