import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
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

import { BaseLocale } from '@/shared/schemas/base_locale/base_locale.schema';

import { FusionCommunesDTO } from './dto/fusion_bases_locales.dto';
import { AdminService } from './admin.service';
import { SuperAdminGuard } from '@/lib/guards/admin.guard';
import { BaseLocaleService } from '../base_locale/base_locale.service';

@ApiTags('admin')
@Controller('admin')
export class AdminController {
  constructor(
    private adminService: AdminService,
    private baseLocaleService: BaseLocaleService,
  ) {}

  @Post('/fusion-communes')
  @ApiOperation({
    summary: 'Fusion communes',
    operationId: 'fusionCommunes',
  })
  @ApiBody({ type: FusionCommunesDTO, required: true })
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

    const csvFile = await getStream(
      pumpify.obj(
        intoStream.object(emails.filter(Boolean).map((email) => ({ email }))),
        csvWriter(),
      ),
    );

    res
      .status(HttpStatus.OK)
      .attachment('emails.csv')
      .type('csv')
      .send(csvFile);
  }
}
