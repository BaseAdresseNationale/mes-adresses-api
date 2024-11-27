import { Controller, Get, HttpStatus, Res, UseGuards } from '@nestjs/common';

import { Response } from 'express';
import * as csvWriter from 'csv-write-stream';
import * as getStream from 'get-stream';
import * as intoStream from 'into-stream';
import * as pumpify from 'pumpify';
import { BaseLocaleService } from '../base_locale/base_locale.service';
import { SuperAdminGuard } from '@/lib/guards/admin.guard';
import { VoieService } from '../voie/voie.service';
import { FilaireVoieDTO } from '../voie/dto/filaire_voie.dto';
import { ApiExcludeController } from '@nestjs/swagger';

@Controller('admin')
@ApiExcludeController()
export class AdminController {
  constructor(
    private baseLocaleService: BaseLocaleService,
    private voieService: VoieService,
  ) {}

  @Get('/emails.csv')
  @UseGuards(SuperAdminGuard)
  async downloadEmailCsv(@Res() res: Response) {
    const emails: string[][] =
      await this.baseLocaleService.findDistinct('emails');
    const flattenEmails = emails.reduce(
      (acc, email) => [...acc, ...(email || [])],
      [],
    );
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
  @UseGuards(SuperAdminGuard)
  async getFilairesVoies(@Res() res: Response) {
    const filaires: Partial<FilaireVoieDTO>[] =
      await this.voieService.getFilairesVoies();

    res.status(HttpStatus.OK).json(filaires);
  }
}
