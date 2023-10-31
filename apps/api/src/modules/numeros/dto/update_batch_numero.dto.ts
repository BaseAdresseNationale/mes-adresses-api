import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { Types } from 'mongoose';
import {
  IsMongoId,
  ValidateNested,
  ArrayNotEmpty,
  IsNotEmptyObject,
} from 'class-validator';

import { UpdateBatchNumeroChnageDto } from '@/modules/numeros/dto/update_batch_numero_change.dto';

export class UpdateBatchNumeroDto {
  @ArrayNotEmpty()
  @IsMongoId({ each: true })
  @ApiProperty({ required: true, nullable: false, isArray: true })
  numerosIds?: Types.ObjectId[];

  @IsNotEmptyObject()
  @ValidateNested()
  @Type(() => UpdateBatchNumeroChnageDto)
  @ApiProperty({
    type: () => UpdateBatchNumeroChnageDto,
    required: true,
    nullable: false,
  })
  changes?: UpdateBatchNumeroChnageDto;
}
