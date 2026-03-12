import { MissingAddressContext, Report } from '@/shared/openapi-signalement';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsEnum,
  IsObject,
  IsOptional,
  ValidateNested,
} from 'class-validator';

class MissingAddressContextDTO implements MissingAddressContext {
  @ApiProperty({ required: false, nullable: true, type: String })
  idBAN?: string;

  @ApiProperty({ required: false, nullable: true, type: String })
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
