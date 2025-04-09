import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';

import { Response } from 'express';
import * as csvWriter from 'csv-write-stream';
import * as getStream from 'get-stream';
import * as intoStream from 'into-stream';
import * as pumpify from 'pumpify';
import { BaseLocaleService } from '../base_locale/base_locale.service';
import { SuperAdminGuard } from '@/lib/guards/admin.guard';
import { VoieService } from '../voie/voie.service';
import { FilaireVoieDTO } from '../voie/dto/filaire_voie.dto';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiExcludeEndpoint,
  ApiTags,
} from '@nestjs/swagger';
import { BaseLocale } from '@/shared/entities/base_locale.entity';
import { FusionCommunesDTO } from './dto/fusion_bases_locales.dto';
import { AdminService } from './admin.service';

@ApiTags('admin')
@Controller('admin')
export class AdminController {
  constructor(
    private baseLocaleService: BaseLocaleService,
    private voieService: VoieService,
    private adminService: AdminService,
  ) {}

  @ApiExcludeEndpoint()
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

  @ApiExcludeEndpoint()
  @Get('filaires-voies')
  @UseGuards(SuperAdminGuard)
  async getFilairesVoies(@Res() res: Response) {
    const filaires: Partial<FilaireVoieDTO>[] =
      await this.voieService.getFilairesVoies();

    res.status(HttpStatus.OK).json(filaires);
  }

  @Post('/fusion-communes')
  @ApiOperation({
    summary: 'Fusion communes',
    operationId: 'fusionCommunes',
  })
  @ApiBody({
    type: FusionCommunesDTO,
    required: true,
    description: `
    {
      "codeCommune": "08439",
      "nom": "BAL Tannay-le-Mont-Dieu (08439)",
      "emails": [
        "adresse@data.gouv.fr"
      ],
      "communes": [
        {
          "codeCommune": "08300"
        },
        {
          "codeCommune": "08439",
          "balId": "679bac11cba48267afdca26b"
        }
      ]
    }`,
  })
  @ApiResponse({ status: HttpStatus.OK, type: BaseLocale, isArray: true })
  @ApiBearerAuth('admin-token')
  @UseGuards(SuperAdminGuard)
  async fusionCommunes(
    @Body() fusionCommunesDTO: FusionCommunesDTO,
    @Res() res: Response,
  ) {
    const result: BaseLocale =
      await this.adminService.fusionCommunes(fusionCommunesDTO);

    res.status(HttpStatus.OK).json(result);
  }
}
