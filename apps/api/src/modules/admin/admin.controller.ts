import {
  Body,
  Controller,
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

import { BaseLocale } from '@/shared/schemas/base_locale/base_locale.schema';

import { FusionCommunesDTO } from './dto/fusion_bases_locales.dto';
import { AdminService } from './admin.service';
import { SuperAdminGuard } from '@/lib/guards/admin.guard';

@ApiTags('admin')
@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

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
}
