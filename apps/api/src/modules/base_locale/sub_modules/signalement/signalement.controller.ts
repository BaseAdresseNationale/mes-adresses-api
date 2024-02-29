import { Controller, Res, Req, HttpStatus, Get } from '@nestjs/common';
import { Response } from 'express';
import { ApiParam, ApiTags, ApiResponse, ApiOperation } from '@nestjs/swagger';

import { CustomRequest } from '@/lib/types/request.type';
import { SignalementService } from './signalement.service';
import { Signalement } from './openapi';

@ApiTags('signalement')
@Controller('')
export class SignalementController {
  constructor(private signalementService: SignalementService) {}

  @Get('/signalements/:codeCommune')
  @ApiOperation({
    summary: 'Find all signalements for a given codeCommune',
    operationId: 'getSignalements',
  })
  @ApiParam({ name: 'codeCommune', required: true, type: String })
  @ApiResponse({ status: 200, type: Array<Signalement> })
  async getSignalements(@Req() req: CustomRequest, @Res() res: Response) {
    try {
      const signalements =
        await this.signalementService.getSignalementsByCodeCommune(
          req.params.codeCommune,
        );
      res.status(HttpStatus.OK).json(signalements);
    } catch (err) {
      console.log('err', err);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json([]);
    }
  }
}
