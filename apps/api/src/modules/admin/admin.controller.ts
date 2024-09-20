import { Controller, Get, HttpStatus, Res, UseGuards } from '@nestjs/common';
import {
  ApiResponse,
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Response } from 'express';
import * as csvWriter from 'csv-write-stream';
import * as getStream from 'get-stream';
import * as intoStream from 'into-stream';
import * as pumpify from 'pumpify';
import { BaseLocaleService } from '../base_locale/base_locale.service';
import { SuperAdminGuard } from '@/lib/guards/admin.guard';
import { VoieService } from '../voie/voie.service';
import { FilaireVoieDTO } from '../voie/dto/filaire_voie.dto';

@ApiTags('admin')
@Controller('admin')
export class AdminController {
  constructor(
    private baseLocaleService: BaseLocaleService,
    private voieService: VoieService,
  ) {}

  @Get('/emails.csv')
  @ApiOperation({
    summary: 'download email.csv',
    operationId: 'downloadEmailCsv',
  })
  @ApiBearerAuth('admin-token')
  @UseGuards(SuperAdminGuard)
  async downloadEmailCsv(@Res() res: Response) {
    const emails: string[] =
      await this.baseLocaleService.findDistinct('emails');

    const flattenEmails = emails.reduce((acc, email) => [...acc, ...email], []);
    const uniqueEmails = [...new Set(flattenEmails)];

    const csvFile = await getStream(
      pumpify.obj(
        intoStream.object(Array.from(uniqueEmails).map((email) => ({ email }))),
        csvWriter(),
      ),
    );

    res
      .status(HttpStatus.OK)
      .attachment('emails.csv')
      .type('csv')
      .send(csvFile);
  }

  @Get('filaires-voies')
  @ApiOperation({
    summary: 'Get filaires voies from the published BALs',
    operationId: 'getFilairesVoies',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: Array<Partial<FilaireVoieDTO>>,
    isArray: true,
  })
  @ApiBearerAuth('admin-token')
  @UseGuards(SuperAdminGuard)
  async getFilairesVoies(@Res() res: Response) {
    const filaires: Partial<FilaireVoieDTO>[] =
      await this.voieService.getFilairesVoies();

    res.status(HttpStatus.OK).json(filaires);
  }
}
