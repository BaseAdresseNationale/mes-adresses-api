import { ApiProperty } from '@nestjs/swagger';
import { Event } from '@/shared/entities/event.entity';

export class EventPageDTO {
  @ApiProperty()
  offset: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  count: number;

  @ApiProperty({ type: () => Event, isArray: true })
  results: Event[];
}
