import { ApiProperty } from '@nestjs/swagger';
import { PositionTypeEnum } from '@/lib/schemas/position_type.enum';
import { ValidatorBal } from '@/lib/validator/validator_bal.validator';
import { Types } from 'mongoose';
import {
  MaxLength,
  IsMongoId,
  Validate,
  IsOptional,
  IsEnum,
  IsNotEmpty,
} from 'class-validator';

export class UpdateBatchNumeroChnageDto {
  @IsOptional()
  @MaxLength(5000)
  @ApiProperty({ required: false, nullable: true })
  comment?: string;

  @IsOptional()
  @IsMongoId()
  @ApiProperty({ required: false, nullable: true })
  toponyme?: Types.ObjectId;

  @IsOptional()
  @IsNotEmpty()
  @IsMongoId()
  @ApiProperty({ required: false, nullable: false })
  voie?: Types.ObjectId;

  @IsOptional()
  @IsNotEmpty()
  @IsEnum(PositionTypeEnum)
  @Validate(ValidatorBal, ['position'])
  @ApiProperty()
  positionType?: PositionTypeEnum;

  @IsOptional()
  @IsNotEmpty()
  @ApiProperty({ required: false, nullable: false })
  certifie?: boolean;
}