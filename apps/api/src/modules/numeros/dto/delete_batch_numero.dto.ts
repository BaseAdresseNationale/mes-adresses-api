import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, ArrayNotEmpty } from 'class-validator';
import { Types } from 'mongoose';

export class DeleteBatchNumeroDTO {
  @ArrayNotEmpty()
  @IsMongoId({ each: true })
  @ApiProperty({ type: String, required: true, nullable: false, isArray: true })
  numerosIds?: Types.ObjectId[];
}
