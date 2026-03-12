import { Report } from '@/shared/openapi-signalement';
import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsEnum } from 'class-validator';

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
