import { ApiProperty } from '@nestjs/swagger';
import { Types } from 'mongoose';
import {
  MaxLength,
  IsMongoId,
  IsOptional,
  IsEnum,
  IsNotEmpty,
} from 'class-validator';

import { PositionTypeEnum } from '@/shared/schemas/position_type.enum';

export class UpdateBatchNumeroChangeDTO {
  @IsOptional()
  @MaxLength(5000)
  @ApiProperty({ required: false, nullable: true })
  comment?: string;

  @IsOptional()
  @IsMongoId()
  @ApiProperty({ type: String, required: false, nullable: true })
  toponyme?: Types.ObjectId;

  @IsOptional()
  @IsNotEmpty()
  @IsMongoId()
  @ApiProperty({ type: String, required: false, nullable: false })
  voie?: Types.ObjectId;

  @IsOptional()
  @IsNotEmpty()
  @IsEnum(PositionTypeEnum)
  @ApiProperty({ required: false, nullable: false })
  positionType?: PositionTypeEnum;

  @IsOptional()
  @IsNotEmpty()
  @ApiProperty({ required: false, nullable: false })
  certifie?: boolean;
}
