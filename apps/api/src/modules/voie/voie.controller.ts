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
  ApiQuery,
} from '@nestjs/swagger';

import { Voie } from '@/shared/entities/voie.entity';
import { Numero } from '@/shared/entities/numero.entity';
import { filterSensitiveFields } from '@/shared/utils/numero.utils';
import { Toponyme } from '@/shared/entities/toponyme.entity';

import { CustomRequest } from '@/lib/types/request.type';
import { AdminGuard } from '@/lib/guards/admin.guard';
import { VoieService } from '@/modules/voie/voie.service';
import { ExtendedVoieDTO } from '@/modules/voie/dto/extended_voie.dto';
import { UpdateVoieDTO } from '@/modules/voie/dto/update_voie.dto';
import { RestoreVoieDTO } from '@/modules/voie/dto/restore_voie.dto';
import { CreateNumeroDTO } from '@/modules/numeros/dto/create_numero.dto';
import { NumeroService } from '@/modules/numeros/numero.service';
import { IsNull } from 'typeorm';

@ApiTags('voies')
@Controller('voies')
export class VoieController {
  constructor(
    private voieService: VoieService,
    @Inject(forwardRef(() => NumeroService))
    private numeroService: NumeroService,
  ) {}

  @Get(':voieId')
  @ApiOperation({ summary: 'Find Voie by id', operationId: 'findVoie' })
  @ApiParam({ name: 'voieId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK, type: ExtendedVoieDTO })
  @ApiBearerAuth('admin-token')
  async find(@Req() req: CustomRequest, @Res() res: Response) {
    const voieExtended: ExtendedVoieDTO = await this.voieService.extendVoie(
      req.voie,
    );
    res.status(HttpStatus.OK).json(voieExtended);
  }

  @Put(':voieId')
  @ApiOperation({ summary: 'Update Voie by id', operationId: 'updateVoie' })
  @ApiParam({ name: 'voieId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK, type: Voie })
  @ApiBody({ type: UpdateVoieDTO, required: true })
  @ApiBearerAuth('admin-token')
  @UseGuards(AdminGuard)
  async update(
    @Req() req: CustomRequest,
    @Body() updateVoieDto: UpdateVoieDTO,
    @Res() res: Response,
  ) {
    const result: Voie = await this.voieService.update(req.voie, updateVoieDto);
    res.status(HttpStatus.OK).json(result);
  }

  @Put(':voieId/soft-delete')
  @ApiOperation({
    summary: 'Soft delete Voie by id',
    operationId: 'softDeleteVoie',
  })
  @ApiParam({ name: 'voieId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK, type: Voie })
  @ApiBearerAuth('admin-token')
  @UseGuards(AdminGuard)
  async softDelete(@Req() req: CustomRequest, @Res() res: Response) {
    const result: Voie = await this.voieService.softDelete(req.voie);
    res.status(HttpStatus.OK).json(result);
  }

  @Put(':voieId/restore')
  @ApiOperation({ summary: 'Restore Voie by id', operationId: 'restoreVoie' })
  @ApiParam({ name: 'voieId', required: true, type: String })
  @ApiBody({ type: RestoreVoieDTO, required: true })
  @ApiResponse({ status: HttpStatus.OK, type: Voie })
  @ApiBearerAuth('admin-token')
  @UseGuards(AdminGuard)
  async restore(
    @Req() req: CustomRequest,
    @Body() restoreVoieDto: RestoreVoieDTO,
    @Res() res: Response,
  ) {
    const result: Voie = await this.voieService.restore(
      req.voie,
      restoreVoieDto,
    );
    res.status(HttpStatus.OK).json(result);
  }

  @Delete(':voieId')
  @ApiOperation({ summary: 'Delete Voie by id', operationId: 'deleteVoie' })
  @ApiParam({ name: 'voieId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiBearerAuth('admin-token')
  @UseGuards(AdminGuard)
  async delete(@Req() req: CustomRequest, @Res() res: Response) {
    await this.voieService.delete(req.voie);
    res.status(HttpStatus.NO_CONTENT).send();
  }

  @Get(':voieId/numeros')
  @ApiOperation({
    summary: 'Find all numeros which belong to the voie',
    operationId: 'findVoieNumeros',
  })
  @ApiQuery({ name: 'isdeleted', type: Boolean, required: false })
  @ApiParam({ name: 'voieId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK, type: Numero, isArray: true })
  @ApiBearerAuth('admin-token')
  async findNumerosByVoie(@Req() req: CustomRequest, @Res() res: Response) {
    const numeros: Numero[] = await this.numeroService.findMany(
      {
        voieId: req.voie.id,
        deletedAt: IsNull(),
      },
      null,
      { numero: 1 },
    );
    const result = numeros.map((n) => filterSensitiveFields(n, !req.isAdmin));
    res.status(HttpStatus.OK).json(result);
  }

  @Post(':voieId/numeros')
  @ApiOperation({
    summary: 'Create numero on the voie',
    operationId: 'createNumero',
  })
  @ApiParam({ name: 'voieId', required: true, type: String })
  @ApiBody({ type: CreateNumeroDTO, required: true })
  @ApiResponse({ status: HttpStatus.CREATED, type: Numero })
  @ApiBearerAuth('admin-token')
  @UseGuards(AdminGuard)
  async createNumero(
    @Req() req: CustomRequest,
    @Body() createNumeroDto: CreateNumeroDTO,
    @Res() res: Response,
  ) {
    const result: Numero = await this.numeroService.create(
      req.voie,
      createNumeroDto,
    );
    res.status(HttpStatus.CREATED).json(result);
  }

  @Put(':voieId/convert-to-toponyme')
  @ApiOperation({
    summary: 'Convert Voie (without numeros) to Toponyme',
    operationId: 'convertToToponyme',
  })
  @ApiParam({ name: 'voieId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK, type: Toponyme })
  @ApiBearerAuth('admin-token')
  @UseGuards(AdminGuard)
  async convertVoieToToponyme(@Req() req: CustomRequest, @Res() res: Response) {
    const result: Toponyme = await this.voieService.convertToToponyme(req.voie);
    res.status(HttpStatus.OK).json(result);
  }
}
