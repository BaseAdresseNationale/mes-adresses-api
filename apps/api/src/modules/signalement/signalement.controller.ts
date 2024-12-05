import {
  Body,
  Controller,
  HttpStatus,
  Inject,
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
import { UpdateSignalementDTO } from './dto/update-signalement-dto';

@ApiTags('signalements')
@Controller('signalements')
export class SignalementController {
  constructor(
    @Inject(forwardRef(() => SignalementService))
    private signalementService: SignalementService,
  ) {}

  @Put(':baseLocaleId')
  @ApiOperation({
    summary: 'Update signalements',
    operationId: 'updateSignalements',
  })
  @ApiParam({ name: 'baseLocaleId', required: true, type: String })
  @ApiBody({ type: UpdateSignalementDTO, required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    type: Boolean,
  })
  @ApiBearerAuth('admin-token')
  @UseGuards(AdminGuard)
  async update(
    @Req() req: CustomRequest,
    @Body() updateSignalementDTO: UpdateSignalementDTO,
    @Res() res: Response,
  ) {
    await this.signalementService.updateMany(
      req.baseLocale,
      updateSignalementDTO,
    );
    res.status(HttpStatus.OK).json(true);
  }
}
