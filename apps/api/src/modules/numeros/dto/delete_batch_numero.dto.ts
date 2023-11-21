import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, ArrayNotEmpty } from 'class-validator';

export class DeleteBatchNumeroDTO {
  @ArrayNotEmpty()
  @IsMongoId({ each: true })
  @ApiProperty({ required: true, nullable: false })
  numerosIds?: string[];
}
