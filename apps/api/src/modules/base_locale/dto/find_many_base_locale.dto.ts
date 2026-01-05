import { ApiProperty } from '@nestjs/swagger';

export class FindManyBaseLocalDTO {
  @ApiProperty({ required: true, nullable: false })
  ids?: string[];
}
