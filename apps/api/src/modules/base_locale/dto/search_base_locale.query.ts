import { ApiProperty } from '@nestjs/swagger';

export class SearchBaseLocalQuery {
  @ApiProperty({ required: false, nullable: false })
  limit?: string = '20';

  @ApiProperty({ required: false, nullable: false })
  offset?: string = '0';

  @ApiProperty({ required: false, nullable: false })
  deleted?: string;

  @ApiProperty({ required: false, nullable: false })
  commune?: string;

  @ApiProperty({ required: false, nullable: false })
  email?: string;

  @ApiProperty({ required: false, nullable: false })
  status?: string;
}
