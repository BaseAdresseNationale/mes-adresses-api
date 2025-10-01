import { Controller, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { ApiResponse, ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { Response } from 'express';

import { AlertService } from './alert.service';
import { Alert } from '@/shared/entities/alert.entity';
import { CustomRequest } from '@/lib/types/request.type';

@ApiTags('alerts')
@Controller('alerts')
export class AlertController {
  constructor(private alertService: AlertService) {}

  @Post(':baseLocaleId/compute')
  @ApiOperation({
    summary: 'Compute alerts on a BAL',
    operationId: 'computeAlertBal',
  })
  @ApiParam({ name: 'baseLocaleId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK, type: Alert, isArray: true })
  async computeAlertBal(@Req() req: CustomRequest, @Res() res: Response) {
    const result = await this.alertService.computeAlertsOnBal(req.baseLocale);
    res.status(HttpStatus.OK).json(result);
  }
}
