import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { Types } from 'mongoose';
import { IsMongoId, ValidateNested, ArrayNotEmpty } from 'class-validator';
import { UpdateBatchNumeroChnageDto } from './update_batch_numero_change.dto';

export class UpdateBatchNumeroDto {
  @ArrayNotEmpty()
  @IsMongoId({ each: true })
  @ApiProperty({ required: false, nullable: false, isArray: true })
  numerosIds?: Types.ObjectId[];

  @ValidateNested()
  @Type(() => UpdateBatchNumeroChnageDto)
  @ApiProperty({
    type: () => UpdateBatchNumeroChnageDto,
    required: true,
    nullable: false,
  })
  changes?: UpdateBatchNumeroChnageDto;
}
