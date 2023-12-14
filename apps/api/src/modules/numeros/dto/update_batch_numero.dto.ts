import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { Types } from 'mongoose';
import {
  IsMongoId,
  ValidateNested,
  IsNotEmptyObject,
  IsOptional,
} from 'class-validator';

import { UpdateBatchNumeroChangeDTO } from '@/modules/numeros/dto/update_batch_numero_change.dto';

export class UpdateBatchNumeroDTO {
  @IsOptional()
  @IsMongoId({ each: true })
  @ApiProperty({ type: String, required: true, nullable: false, isArray: true })
  numerosIds: Types.ObjectId[];

  @IsNotEmptyObject()
  @ValidateNested()
  @Type(() => UpdateBatchNumeroChangeDTO)
  @ApiProperty({
    type: () => UpdateBatchNumeroChangeDTO,
    required: true,
    nullable: false,
  })
  changes: UpdateBatchNumeroChangeDTO;
}
