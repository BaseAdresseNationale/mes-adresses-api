import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  UseGuards,
  Res,
  Req,
  HttpStatus,
  Body,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiParam,
  ApiTags,
  ApiResponse,
  ApiBody,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { Voie } from '@/shared/schemas/voie/voie.schema';
import { Numero } from '@/shared/schemas/numero/numero.schema';
import { filterSensitiveFields } from '@/shared/utils/numero.utils';

import { CustomRequest } from '@/lib/types/request.type';
import { AdminGuard } from '@/lib/guards/admin.guard';
import { VoieService } from '@/modules/voie/voie.service';
import { ExtendedVoie } from '@/modules/voie/dto/extended_voie.dto';
import { UpdateVoieDto } from '@/modules/voie/dto/update_voie.dto';
import { RestoreVoieDto } from '@/modules/voie/dto/restore_voie.dto';
import { CreateNumeroDto } from '@/modules/numeros/dto/create_numero.dto';
import { NumeroService } from '@/modules/numeros/numero.service';
import { Toponyme } from '@/shared/schemas/toponyme/toponyme.schema';

@ApiTags('voies')
@Controller('voies')
export class VoieController {
  constructor(
    private voieService: VoieService,
    @Inject(forwardRef(() => NumeroService))
    private numeroService: NumeroService,
  ) {}

  @Get(':voieId')
  @ApiOperation({ summary: 'Find Voie by id' })
  @ApiParam({ name: 'voieId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK, type: ExtendedVoie })
  @ApiBearerAuth('admin-token')
  async find(@Req() req: CustomRequest, @Res() res: Response) {
    const voieExtended: ExtendedVoie = await this.voieService.extendVoie(
      req.voie,
    );
    res.status(HttpStatus.OK).json(voieExtended);
  }

  @Put(':voieId')
  @ApiOperation({ summary: 'Update Voie by id' })
  @ApiParam({ name: 'voieId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK, type: Voie })
  @ApiBody({ type: UpdateVoieDto, required: true })
  @ApiBearerAuth('admin-token')
  @UseGuards(AdminGuard)
  async update(
    @Req() req: CustomRequest,
    @Body() updateVoieDto: UpdateVoieDto,
    @Res() res: Response,
  ) {
    const result: Voie = await this.voieService.update(req.voie, updateVoieDto);
    res.status(HttpStatus.OK).json(result);
  }

  @Put(':voieId/soft-delete')
  @ApiOperation({ summary: 'Soft delete Voie by id' })
  @ApiParam({ name: 'voieId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK, type: Voie })
  @ApiBearerAuth('admin-token')
  @UseGuards(AdminGuard)
  async softDelete(@Req() req: CustomRequest, @Res() res: Response) {
    const result: Voie = await this.voieService.softDelete(req.voie);
    res.status(HttpStatus.OK).json(result);
  }

  @Put(':voieId/restore')
  @ApiOperation({ summary: 'Restore Voie by id' })
  @ApiParam({ name: 'voieId', required: true, type: String })
  @ApiBody({ type: RestoreVoieDto, required: true })
  @ApiResponse({ status: HttpStatus.OK, type: Voie })
  @ApiBearerAuth('admin-token')
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

  @Delete(':voieId')
  @ApiOperation({ summary: 'Delete Voie by id' })
  @ApiParam({ name: 'voieId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiBearerAuth('admin-token')
  @UseGuards(AdminGuard)
  async delete(@Req() req: CustomRequest, @Res() res: Response) {
    await this.voieService.delete(req.voie);
    res.status(HttpStatus.NO_CONTENT).send();
  }

  @Get(':voieId/numeros')
  @ApiOperation({ summary: 'Find all numeros which belong to the voie' })
  @ApiParam({ name: 'voieId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK, type: Numero, isArray: true })
  @ApiBearerAuth('admin-token')
  async findByVoie(@Req() req: CustomRequest, @Res() res: Response) {
    const numeros: Numero[] = await this.numeroService.findMany({
      voie: req.voie._id,
    });
    const result = numeros.map((n) => filterSensitiveFields(n, !req.isAdmin));
    res.status(HttpStatus.OK).json(result);
  }

  @Post(':voieId/numeros')
  @ApiOperation({ summary: 'Create numero on the voie' })
  @ApiParam({ name: 'voieId', required: true, type: String })
  @ApiBody({ type: CreateNumeroDto, required: true })
  @ApiResponse({ status: HttpStatus.CREATED, type: Numero })
  @ApiBearerAuth('admin-token')
  @UseGuards(AdminGuard)
  async createNumero(
    @Req() req: CustomRequest,
    @Body() createNumeroDto: CreateNumeroDto,
    @Res() res: Response,
  ) {
    const result: Numero = await this.numeroService.create(
      req.voie,
      createNumeroDto,
    );
    res.status(HttpStatus.CREATED).json(result);
  }

  @Put(':voieId/convert-to-toponyme')
  @ApiOperation({ summary: 'Convert Voie (without numeros) to Toponyme' })
  @ApiParam({ name: 'voieId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK, type: Toponyme })
  @ApiBearerAuth('admin-token')
  @UseGuards(AdminGuard)
  async convertVoieToToponyme(@Req() req: CustomRequest, @Res() res: Response) {
    const result: Toponyme = await this.voieService.convertToToponyme(req.voie);
    res.status(HttpStatus.OK).json(result);
  }
}
