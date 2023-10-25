import { ApiProperty } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { IsMongoId, ArrayNotEmpty } from 'class-validator';

export class RestoreVoieDto {
  @ArrayNotEmpty()
  @IsMongoId({ each: true })
  @ApiProperty({ required: true, nullable: true, isArray: true })
  numerosIds?: Types.ObjectId[];
}
