import { ApiProperty } from '@nestjs/swagger';

export class SearchBaseLocalQuery {
  @ApiProperty({ required: false, nullable: false })
  limit?: number = 20;

  @ApiProperty({ required: false, nullable: false })
  offset?: number = 0;

  @ApiProperty({ required: false, nullable: false })
  deleted?: boolean = false;

  @ApiProperty({ required: false, nullable: false })
  commune?: string;

  @ApiProperty({ required: false, nullable: false })
  email?: string;

  @ApiProperty({ required: false, nullable: false })
  status?: string;
}
