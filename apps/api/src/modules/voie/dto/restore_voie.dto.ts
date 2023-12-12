import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId } from 'class-validator';
import { Types } from 'mongoose';

export class RestoreVoieDTO {
  @IsMongoId({ each: true })
  @ApiProperty({ type: String, required: true, nullable: true, isArray: true })
  numerosIds?: Types.ObjectId[];
}
