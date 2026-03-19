import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Inject,
  Param,
  Put,
  Req,
  Res,
  UseGuards,
  forwardRef,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';

import { AdminGuard } from '@/lib/guards/admin.guard';
import { CustomRequest } from '@/lib/types/request.type';
import { SignalementService } from './signalement.service';
import {
  UpdateManyReportsDTO,
  UpdateOneReportDTO,
} from './dto/update-signalement-dto';

@ApiTags('signalements')
@Controller('signalements')
export class SignalementController {
  constructor(
    @Inject(forwardRef(() => SignalementService))
    private signalementService: SignalementService,
  ) {}

  @Get('/:baseLocaleId/:reportId')
  @ApiOperation({
    summary: 'Get report by id',
    operationId: 'getReport',
  })
  @ApiParam({ name: 'baseLocaleId', required: true, type: String })
  @ApiParam({ name: 'reportId', required: true, type: String })
  @ApiBearerAuth('admin-token')
  @UseGuards(AdminGuard)
  @ApiResponse({
    status: HttpStatus.OK,
  })
  async getReport(
    @Req() req: Request,
    @Res() res: Response,
    @Param('reportId') reportId: string,
  ) {
    const signalement =
      await this.signalementService.findOneOrFail(reportId);

    res.status(HttpStatus.OK).json(signalement);
  }

  @Put(':baseLocaleId/:reportId')
  @ApiOperation({
    summary: 'Update one report',
    operationId: 'updateReport',
  })
  @ApiParam({ name: 'baseLocaleId', required: true, type: String })
  @ApiParam({ name: 'reportId', required: true, type: String })
  @ApiBody({ type: UpdateOneReportDTO, required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    type: Boolean,
  })
  @ApiBearerAuth('admin-token')
  @UseGuards(AdminGuard)
  async updateOne(
    @Req() req: CustomRequest,
    @Body() updateOneReportDTO: UpdateOneReportDTO,
    @Res() res: Response,
  ) {
    await this.signalementService.updateOne(
      req.baseLocale,
      req.params.reportId,
      updateOneReportDTO,
    );
    res.status(HttpStatus.OK).json(true);
  }

  @Put(':baseLocaleId')
  @ApiOperation({
    summary: 'Update many reports',
    operationId: 'updateReports',
  })
  @ApiParam({ name: 'baseLocaleId', required: true, type: String })
  @ApiBody({ type: UpdateManyReportsDTO, required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    type: Boolean,
  })
  @ApiBearerAuth('admin-token')
  @UseGuards(AdminGuard)
  async updateMany(
    @Req() req: CustomRequest,
    @Body() updateManyReportsDTO: UpdateManyReportsDTO,
    @Res() res: Response,
  ) {
    await this.signalementService.updateMany(
      req.baseLocale,
      updateManyReportsDTO,
    );
    res.status(HttpStatus.OK).json(true);
  }
}
