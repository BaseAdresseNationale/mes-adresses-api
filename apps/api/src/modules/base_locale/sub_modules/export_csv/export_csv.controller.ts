import { Controller, Res, Req, HttpStatus, Get, Query } from '@nestjs/common';
import { Response } from 'express';
import {
  ApiParam,
  ApiTags,
  ApiResponse,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';

import { CustomRequest } from '@/lib/types/request.type';
import { ExportCsvService } from '@/shared/modules/export_csv/export_csv.service';
import { isAdmin } from '@/lib/utils/is-admin.utils';

@ApiTags('export csv')
@Controller('bases-locales')
export class ExportCsvController {
  constructor(private exportCsvService: ExportCsvService) {}

  @Get(':baseLocaleId/csv')
  @ApiOperation({ summary: 'Get Bal csv file', operationId: 'getCsvBal' })
  @ApiParam({ name: 'baseLocaleId', required: true, type: String })
  @ApiQuery({ name: 'withComment', type: Boolean })
  @ApiResponse({ status: HttpStatus.OK })
  async getCsvBal(
    @Req() req: CustomRequest,
    @Query('withComment') withComment: string,
    @Res() res: Response,
  ) {
    const csvFile: string = await this.exportCsvService.exportToCsv(
      req.baseLocale,
      {
        withComment: withComment === 'true' && isAdmin(req, req.baseLocale),
      },
    );
    res.status(HttpStatus.OK).attachment('bal.csv').type('csv').send(csvFile);
  }

  @Get(':baseLocaleId/voies/csv')
  @ApiOperation({ summary: 'Get voies csv file', operationId: 'getCsvVoies' })
  @ApiParam({ name: 'baseLocaleId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK })
  async getCsvVoies(@Req() req: CustomRequest, @Res() res: Response) {
    const csvFile: string = await this.exportCsvService.exportVoiesToCsv(
      req.baseLocale,
    );
    res
      .status(HttpStatus.OK)
      .attachment('liste-des-voies.csv')
      .type('csv')
      .send(csvFile);
  }
}
