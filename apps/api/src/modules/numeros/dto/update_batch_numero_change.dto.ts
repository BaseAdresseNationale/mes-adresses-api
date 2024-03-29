import { ApiProperty } from '@nestjs/swagger';
import { Types } from 'mongoose';
import {
  MaxLength,
  IsMongoId,
  Validate,
  IsOptional,
  IsEnum,
  IsNotEmpty,
} from 'class-validator';

import { PositionTypeEnum } from '@/shared/schemas/position_type.enum';
import { ValidatorBal } from '@/shared/validators/validator_bal.validator';

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
  @Validate(ValidatorBal, ['position'])
  @ApiProperty({ required: false, nullable: false })
  positionType?: PositionTypeEnum;

  @IsOptional()
  @IsNotEmpty()
  @ApiProperty({ required: false, nullable: false })
  certifie?: boolean;
}
