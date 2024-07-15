import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, ArrayNotEmpty } from 'class-validator';

export class DeleteBatchNumeroDTO {
  @ArrayNotEmpty()
  @IsMongoId({ each: true })
  @ApiProperty({ type: String, required: true, nullable: false, isArray: true })
  numerosIds?: string[];
}
