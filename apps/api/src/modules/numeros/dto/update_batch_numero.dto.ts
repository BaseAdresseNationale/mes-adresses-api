import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { Types } from 'mongoose';
import {
  IsMongoId,
  ValidateNested,
  IsNotEmptyObject,
  IsOptional,
} from 'class-validator';

import { UpdateBatchNumeroChangeDto } from '@/modules/numeros/dto/update_batch_numero_change.dto';

export class UpdateBatchNumeroDto {
  @IsOptional()
  @IsMongoId({ each: true })
  @ApiProperty({ required: false, nullable: true, isArray: true })
  numerosIds?: Types.ObjectId[];

  @IsNotEmptyObject()
  @ValidateNested()
  @Type(() => UpdateBatchNumeroChangeDto)
  @ApiProperty({
    type: () => UpdateBatchNumeroChangeDto,
    required: true,
    nullable: false,
  })
  changes?: UpdateBatchNumeroChangeDto;
}
