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
  ApiHeader,
  ApiBody,
  ApiOperation,
} from '@nestjs/swagger';
import { CustomRequest } from '@/lib/types/request.type';
import { AdminGuard } from '@/lib/guards/admin.guard';
import { VoieService } from './voie.service';
import { Voie } from './schema/voie.schema';
import { ExtendedVoie } from './dto/extended_voie.dto';
import { UpdateVoieDto } from './dto/update_voie.dto';
import { RestoreVoieDto } from './dto/restore_voie.dto';
import { CreateNumeroDto } from '../numeros/dto/create_numero.dto';
import { Numero } from '@/shared/schemas/numero/numero.schema';
import { NumeroService } from '../numeros/numero.service';
import { filterSensitiveFields } from '@/shared/utils/numero.utils';

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
  @ApiHeader({ name: 'Token' })
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

  @Put(':voieId/soft-delete')
  @ApiOperation({ summary: 'Soft delete Voie by id' })
  @ApiParam({ name: 'voieId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK, type: Voie })
  @ApiHeader({ name: 'Token' })
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

  @Delete(':voieId')
  @ApiOperation({ summary: 'Delete Voie by id' })
  @ApiParam({ name: 'voieId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiHeader({ name: 'Token' })
  @UseGuards(AdminGuard)
  async delete(@Req() req: CustomRequest, @Res() res: Response) {
    await this.voieService.delete(req.voie);
    res.status(HttpStatus.NO_CONTENT).send();
  }

  @Get(':voieId/numeros')
  @ApiOperation({ summary: 'Find all numeros which belong to the voie' })
  @ApiParam({ name: 'voieId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK, type: Numero, isArray: true })
  @ApiHeader({ name: 'Token' })
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
  @ApiHeader({ name: 'Token' })
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
}
