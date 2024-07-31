import { ApiProperty } from '@nestjs/swagger';
import { Equals, Validate } from 'class-validator';
import { LineStringValidator } from '@/shared/validators/coord.validator';
import {
  LineString as LineStringTurf,
  Position as PositionTurf,
} from '@turf/helpers';

export class LineString implements LineStringTurf {
  @Equals('LineString')
  @ApiProperty({
    enum: ['LineString'],
    type: String,
  })
  type: 'LineString';

  @Validate(LineStringValidator)
  @ApiProperty({
    type: 'array',
    items: {
      type: 'array',
      items: {
        type: 'number',
      },
    },
  })
  coordinates: PositionTurf[];
}
