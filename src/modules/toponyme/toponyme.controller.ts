import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('toponymes')
@Controller('toponymes')
export class ToponymeController {
  constructor() {}
}
