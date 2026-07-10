import { ApiProperty } from '@nestjs/swagger';
import { Validate } from 'class-validator';
import { PolygonValidator } from '@/shared/validators/coord.validator';

export class SearchNumeroDTO {
  @Validate(PolygonValidator, {
    message: 'polygon:Les coordonnées du polygon ne sont pas valides',
  })
  @ApiProperty({
    type: 'array',
    items: {
      type: 'array',
      items: {
        type: 'number',
      },
    },
    required: true,
    nullable: false,
  })
  polygon: number[][];
}
