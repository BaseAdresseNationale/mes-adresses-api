import { Controller, Res, Req, HttpStatus, Get } from '@nestjs/common';
import { Response } from 'express';
import { ApiParam, ApiTags, ApiResponse, ApiOperation } from '@nestjs/swagger';

import { CustomRequest } from '@/lib/types/request.type';
import { ExportCsvService } from '@/shared/modules/export_csv/export_csv.service';

@ApiTags('export csv')
@Controller('bases-locales')
export class ExportCsvController {
  constructor(private exportCsvService: ExportCsvService) {}

  @Get(':baseLocaleId/csv')
  @ApiOperation({ summary: 'Get Bal csv file' })
  @ApiParam({ name: 'baseLocaleId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK })
  async getCsvBal(@Req() req: CustomRequest, @Res() res: Response) {
    const csvFile: string = await this.exportCsvService.exportToCsv(
      req.baseLocale,
    );
    res.status(HttpStatus.OK).attachment('bal.csv').type('csv').send(csvFile);
  }

  @Get(':baseLocaleId/voies/csv')
  @ApiOperation({ summary: 'Get voies csv file' })
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
