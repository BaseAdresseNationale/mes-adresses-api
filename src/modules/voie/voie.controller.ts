import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('voies')
@Controller('voies')
export class VoieController {
  constructor() {}
}
