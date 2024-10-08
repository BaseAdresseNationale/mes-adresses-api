import { ApiProperty } from '@nestjs/swagger';
import {
  MaxLength,
  IsOptional,
  IsEnum,
  IsNotEmpty,
  IsMongoId,
  ValidateIf,
} from 'class-validator';

import { PositionTypeEnum } from '@/shared/entities/position.entity';

export class UpdateBatchNumeroChangeDTO {
  @IsOptional()
  @MaxLength(5000)
  @ApiProperty({ required: false, nullable: true })
  comment?: string;

  @IsOptional()
  @IsMongoId()
  @ApiProperty({ type: String, required: false, nullable: true })
  toponymeId?: string;

  @IsMongoId()
  @ValidateIf((object, value) => {
    return value !== undefined;
  })
  @ApiProperty({ type: String, required: false, nullable: false })
  voieId?: string;

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
