import { Controller, Res, Req, HttpStatus, Get } from '@nestjs/common';
import { Response, Request } from 'express';
import { ApiParam, ApiTags, ApiResponse } from '@nestjs/swagger';

import { CommuneService } from './commune.service';

@ApiTags('commune')
@Controller('commune')
export class CommuneController {
  constructor(private communeService: CommuneService) {}

  @Get(':codeCommune')
  @ApiParam({ name: 'codeCommune', required: true, type: String })
  @ApiResponse({ status: 200 })
  async getCommuneExtraData(@Req() req: Request, @Res() res: Response) {
    const { codeCommune } = req.params;
    const communeExtraData =
      await this.communeService.getCommuneExtraData(codeCommune);
    res.status(HttpStatus.OK).json(communeExtraData);
  }
}
