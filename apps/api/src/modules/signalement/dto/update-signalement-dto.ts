import {
  CreatedAddress,
  MissingAddressContext,
  Report,
} from '@/shared/openapi-signalement';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class CreatedAddressDTO implements CreatedAddress {
  @ApiProperty({ required: true, nullable: false, type: String })
  @IsString()
  idBAN: string;

  @ApiProperty({ required: true, nullable: false, type: String })
  @IsString()
  label: string;
}

class MissingAddressContextDTO implements MissingAddressContext {
  @ApiProperty({
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CreatedAddressDTO)
  createdAddress?: CreatedAddressDTO | null;

  @ApiProperty({ required: false, nullable: true, type: String })
  @IsOptional()
  @IsString()
  idRNB?: string;
}

export class UpdateOneReportDTO {
  @ApiProperty({ required: true, nullable: false, enum: Report.status })
  @IsEnum(Report.status)
  status: Report.status;

  @ApiProperty({ required: false, nullable: true, type: String })
  rejectionReason?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => MissingAddressContextDTO)
  @ApiProperty({
    required: false,
    nullable: true,
    type: MissingAddressContextDTO,
  })
  context?: MissingAddressContextDTO | null;
}

export class UpdateManyReportsDTO {
  @ApiProperty({
    type: String,
    required: true,
    nullable: false,
    isArray: true,
  })
  @ArrayMinSize(1)
  ids: string[];

  @ApiProperty({ required: true, nullable: false, enum: Report.status })
  @IsEnum(Report.status)
  status: Report.status;
}
