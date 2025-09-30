import { ApiProperty } from '@nestjs/swagger';
import { Equals, Validate } from 'class-validator';
import { LineStringValidator } from '@/shared/validators/coord.validator';
import {
  LineString as LineStringGeoJSON,
  Position as PositionGeoJSON,
} from 'geojson';

export class LineString implements LineStringGeoJSON {
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
  coordinates: PositionGeoJSON[];
}
