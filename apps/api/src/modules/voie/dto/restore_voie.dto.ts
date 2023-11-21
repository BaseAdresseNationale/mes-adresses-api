import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId } from 'class-validator';

export class RestoreVoieDTO {
  @IsMongoId({ each: true })
  @ApiProperty({ required: true, nullable: true })
  numerosIds?: string[];
}
