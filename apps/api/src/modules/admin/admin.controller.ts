import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
  Req,
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
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiExcludeEndpoint,
  ApiTags,
  ApiParam,
} from '@nestjs/swagger';
import { BaseLocale } from '@/shared/entities/base_locale.entity';
import { FusionCommunesDTO } from './dto/fusion_bases_locales.dto';
import { AdminService } from './admin.service';
import { CustomRequest } from '@/lib/types/request.type';

@ApiTags('admin')
@Controller('admin')
export class AdminController {
  constructor(
    private baseLocaleService: BaseLocaleService,
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

  @Post('bases-locales/:baseLocaleId/sync-ids-ban-publish')
  @ApiOperation({
    summary: 'Synchro ids BAL with ids BAN and publish',
    operationId: 'syncIdsBANPublish',
  })
  @ApiParam({ name: 'baseLocaleId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.CREATED, type: BaseLocale })
  @ApiBearerAuth('admin-token')
  @UseGuards(SuperAdminGuard)
  async syncIdsBANPublish(@Req() req: CustomRequest, @Res() res: Response) {
    try {
      await this.baseLocaleService.syncIdsBAN(req.baseLocale);
      const result = await this.baseLocaleService.forcePublish(
        req.baseLocale.id,
      );
      if (!result.success) {
        throw new HttpException(result.error, HttpStatus.PRECONDITION_FAILED);
      }
      const baseLocale = await this.baseLocaleService.findOneOrFail(
        req.baseLocale.id,
      );
      res.status(HttpStatus.OK).json(baseLocale);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    res.status(HttpStatus.NO_CONTENT).send();
  }
}
