import { Controller } from '@nestjs/common';
import {
  Controller,
  Get,
  Put,
  Delete,
  UseGuards,
  Res,
  Post,
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
import { VoieExtends } from './dto/voie.extends.dto';

@ApiTags('voies')
@Controller('voies')
export class VoieController {
  constructor(private voieService: VoieService) {}

  @Get('voies/:voieId')
  @ApiOperation({ summary: 'Find Voie by id' })
  @ApiParam({ name: 'voieId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK, type: VoieExtends })
  @ApiHeader({ name: 'Token' })
  async find(@Req() req: CustomRequest, @Res() res: Response) {
    const voieExtended: VoieExtends = await this.voieService.extendVoie(
      req.voie,
    );
    res.status(HttpStatus.OK).json(voieExtended);
  }

  // @Put('voies/:voieId')
  // @ApiOperation({ summary: 'Update the numero by id' })
  // @ApiParam({ name: 'voieId', required: true, type: String })
  // @ApiResponse({ status: HttpStatus.OK, type: Voie })
  // @ApiBody({ type: UpdateNumeroDto, required: true })
  // @ApiHeader({ name: 'Token' })
  // @UseGuards(AdminGuard)
  // async update(
  //   @Req() req: CustomRequest,
  //   @Body() updateNumeroDto: UpdateNumeroDto,
  //   @Res() res: Response,
  // ) {
  //   const result: Voie = await this.numeroService.update(
  //     req.numero,
  //     updateNumeroDto,
  //   );
  //   res.status(HttpStatus.OK).json(result);
  // }

  // @Put('voies/:voieId/soft-delete')
  // @ApiOperation({ summary: 'Soft delete the numero by id' })
  // @ApiParam({ name: 'voieId', required: true, type: String })
  // @ApiResponse({ status: HttpStatus.OK, type: Voie })
  // @ApiHeader({ name: 'Token' })
  // @UseGuards(AdminGuard)
  // async softDelete(@Req() req: CustomRequest, @Res() res: Response) {
  //   const result = await this.numeroService.softDelete(req.numero);
  //   res.status(HttpStatus.OK).json(result);
  // }

  // @Delete('voies/:voieId')
  // @ApiOperation({ summary: 'Delete the numero by id' })
  // @ApiParam({ name: 'voieId', required: true, type: String })
  // @ApiResponse({ status: HttpStatus.NO_CONTENT })
  // @ApiHeader({ name: 'Token' })
  // @UseGuards(AdminGuard)
  // async delete(@Req() req: CustomRequest, @Res() res: Response) {
  //   await this.numeroService.delete(req.numero);
  //   res.status(HttpStatus.NO_CONTENT).send();
  // }
}
