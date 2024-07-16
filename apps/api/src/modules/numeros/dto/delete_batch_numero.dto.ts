import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsUUID } from 'class-validator';

export class DeleteBatchNumeroDTO {
  @ArrayNotEmpty()
  @IsUUID(4, { each: true })
  @ApiProperty({ type: String, required: true, nullable: false, isArray: true })
  numerosIds?: string[];
}
