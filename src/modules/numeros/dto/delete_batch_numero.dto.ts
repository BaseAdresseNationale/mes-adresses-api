import { ApiProperty } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { IsMongoId, ArrayNotEmpty } from 'class-validator';

export class DeleteBatchNumeroDto {
  @ArrayNotEmpty()
  @IsMongoId({ each: true })
  @ApiProperty({ required: true, nullable: false, isArray: true })
  numerosIds?: Types.ObjectId[];
}
