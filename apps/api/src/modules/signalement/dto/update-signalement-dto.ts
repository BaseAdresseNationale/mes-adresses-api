import { Signalement } from '@/shared/openapi-signalement';
import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsEnum } from 'class-validator';

export class UpdateOneSignalementDTO {
  @ApiProperty({ required: true, nullable: false, enum: Signalement.status })
  @IsEnum(Signalement.status)
  status: Signalement.status;

  @ApiProperty({ required: false })
  rejectionReason?: string;
}

export class UpdateManySignalementDTO {
  @ApiProperty({
    type: String,
    required: true,
    nullable: false,
    isArray: true,
  })
  @ArrayMinSize(1)
  ids: string[];

  @ApiProperty({ required: true, nullable: false, enum: Signalement.status })
  @IsEnum(Signalement.status)
  status: Signalement.status;
}
