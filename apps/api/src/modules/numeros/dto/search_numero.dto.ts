import { ApiProperty } from '@nestjs/swagger';

export class SearchNumeroDTO {
  @ApiProperty({
    type: [Number],
    required: true,
    nullable: false,
    isArray: true,
  })
  polygon: number[][];
}
