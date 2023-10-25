import {
  Controller,
  Get,
  Put,
  Delete,
  UseGuards,
  Res,
  Req,
  HttpStatus,
  Body,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiParam,
  ApiTags,
  ApiResponse,
  ApiHeader,
  ApiBody,
  ApiOperation,
} from '@nestjs/swagger';
import { CustomRequest } from '@/lib/middlewares/types/request.type';
import { AdminGuard } from '@/lib/guards/admin.guard';
import { VoieService } from './voie.service';
import { Voie } from './schema/voie.schema';
import { ExtentedVoie } from './dto/extended_voie.dto';
import { UpdateVoieDto } from './dto/update_voie.dto';
import { RestoreVoieDto } from './dto/restore_voie.dto';

@ApiTags('voies')
@Controller()
export class VoieController {
  constructor(private voieService: VoieService) {}

  @Get('voies/:voieId')
  @ApiOperation({ summary: 'Find Voie by id' })
  @ApiParam({ name: 'voieId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK, type: ExtentedVoie })
  @ApiHeader({ name: 'Token' })
  async find(@Req() req: CustomRequest, @Res() res: Response) {
    const voieExtended: ExtentedVoie = await this.voieService.extendVoie(
      req.voie,
    );
    res.status(HttpStatus.OK).json(voieExtended);
  }

  @Put('voies/:voieId')
  @ApiOperation({ summary: 'Update Voie by id' })
  @ApiParam({ name: 'voieId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK, type: Voie })
  @ApiBody({ type: UpdateVoieDto, required: true })
  @ApiHeader({ name: 'Token' })
  @UseGuards(AdminGuard)
  async update(
    @Req() req: CustomRequest,
    @Body() updateVoieDto: UpdateVoieDto,
    @Res() res: Response,
  ) {
    const result: Voie = await this.voieService.update(req.voie, updateVoieDto);
    res.status(HttpStatus.OK).json(result);
  }

  @Put('voies/:voieId/soft-delete')
  @ApiOperation({ summary: 'Soft delete Voie by id' })
  @ApiParam({ name: 'voieId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK, type: Voie })
  @ApiHeader({ name: 'Token' })
  @UseGuards(AdminGuard)
  async softDelete(@Req() req: CustomRequest, @Res() res: Response) {
    const result: Voie = await this.voieService.softDelete(req.voie);
    res.status(HttpStatus.OK).json(result);
  }

  @Put('voies/:voieId/restore')
  @ApiOperation({ summary: 'Restore Voie by id' })
  @ApiParam({ name: 'voieId', required: true, type: String })
  @ApiBody({ type: RestoreVoieDto, required: true })
  @ApiResponse({ status: HttpStatus.OK, type: Voie })
  @ApiHeader({ name: 'Token' })
  @UseGuards(AdminGuard)
  async restore(
    @Req() req: CustomRequest,
    @Body() restoreVoieDto: RestoreVoieDto,
    @Res() res: Response,
  ) {
    const result: Voie = await this.voieService.restore(
      req.voie,
      restoreVoieDto,
    );
    res.status(HttpStatus.OK).json(result);
  }

  @Delete('voies/:voieId')
  @ApiOperation({ summary: 'Delete Voie by id' })
  @ApiParam({ name: 'voieId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiHeader({ name: 'Token' })
  @UseGuards(AdminGuard)
  async delete(@Req() req: CustomRequest, @Res() res: Response) {
    await this.voieService.delete(req.voie);
    res.status(HttpStatus.NO_CONTENT).send();
  }
}
