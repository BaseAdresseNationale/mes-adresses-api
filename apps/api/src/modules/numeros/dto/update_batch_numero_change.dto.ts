import { ApiProperty } from '@nestjs/swagger';
import {
  MaxLength,
  Validate,
  IsOptional,
  IsEnum,
  IsNotEmpty,
  IsUUID,
} from 'class-validator';

import { PositionTypeEnum } from '@/shared/schemas/position_type.enum';
import { ValidatorBal } from '@/shared/validators/validator_bal.validator';

export class UpdateBatchNumeroChangeDTO {
  @IsOptional()
  @MaxLength(5000)
  @ApiProperty({ required: false, nullable: true })
  comment?: string;

  @IsOptional()
  @IsUUID(4)
  @ApiProperty({ type: String, required: false, nullable: true })
  toponymeId?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsUUID(4)
  @ApiProperty({ type: String, required: false, nullable: false })
  voieId?: string;

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
