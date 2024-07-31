import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId } from 'class-validator';

export class RestoreVoieDTO {
  @IsMongoId({ each: true })
  @ApiProperty({ type: String, required: true, nullable: true, isArray: true })
  numerosIds?: string[];
}
