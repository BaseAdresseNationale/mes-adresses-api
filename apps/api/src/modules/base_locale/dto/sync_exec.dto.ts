import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, IsUUID } from 'class-validator';

export class SyncExecDTO {
  // Ids des events (parents principaux) à ne pas publier cette fois-ci —
  // leur descendance est résolue côté serveur (voir
  // EventService.findEventsWithDescendants).
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  @ApiProperty({ type: String, isArray: true, required: false })
  ignoreEvents?: string[];
}
