import { ApiProperty } from '@nestjs/swagger';
import { EventDTO } from './event.dto';

export class EventPageDTO {
  @ApiProperty()
  offset: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  count: number;

  @ApiProperty({ type: () => EventDTO, isArray: true })
  results: EventDTO[];
}
