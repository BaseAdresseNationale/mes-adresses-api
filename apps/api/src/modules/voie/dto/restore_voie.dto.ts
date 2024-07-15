import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class RestoreVoieDTO {
  @IsUUID(4, { each: true })
  @ApiProperty({ type: String, required: true, nullable: true, isArray: true })
  numerosIds?: string[];
}
