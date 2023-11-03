import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Inject,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
  forwardRef,
} from '@nestjs/common';
import {
  ApiBody,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request, Response } from 'express';

import { Toponyme } from '@/shared/schemas/toponyme/toponyme.schema';
import { Voie } from '@/shared/schemas/voie/voie.schema';

import { BaseLocaleService } from '@/modules/base_locale/base_locale.service';
import { CreateBaseLocaleDTO } from '@/modules/base_locale/dto/create_base_locale.dto';
import { AdminGuard } from '@/lib/guards/admin.guard';
import { CustomRequest } from '@/lib/types/request.type';
import { UpdateBatchNumeroDto } from '@/modules/numeros/dto/update_batch_numero.dto';
import { NumeroService } from '@/modules/numeros/numero.service';
import { DeleteBatchNumeroDto } from '@/modules/numeros/dto/delete_batch_numero.dto';
import { VoieService } from '@/modules/voie/voie.service';
import { ToponymeService } from '@/modules/toponyme/toponyme.service';
import { CreateVoieDto } from '@/modules/voie/dto/create_voie.dto';
import { ExtentedToponyme } from '@/modules/toponyme/dto/extended_toponyme.dto';
import { CreateToponymeDto } from '@/modules/toponyme/dto/create_toponyme.dto';
import { filterSensitiveFields } from '@/shared/utils/base-locale.utils';
import { ExtendedBaseLocale } from './dto/extended_base_locale';
import { ExtendedVoie } from '../voie/dto/extended_voie.dto';
import { UpdateBaseLocaleDTO } from './dto/update_base_locale.dto';
import { BaseLocale } from '@/shared/schemas/base_locale/base_locale.schema';
import { CreateDemoBaseLocaleDTO } from './dto/create_demo_base_locale.dto';

@ApiTags('bases-locales')
@Controller('bases-locales')
export class BaseLocaleController {
  constructor(
    private baseLocaleService: BaseLocaleService,
    @Inject(forwardRef(() => NumeroService))
    private numeroService: NumeroService,
    @Inject(forwardRef(() => VoieService))
    private voieService: VoieService,
    @Inject(forwardRef(() => ToponymeService))
    private toponymeService: ToponymeService,
  ) {}
  @Post('')
  @ApiOperation({ summary: 'Create a base locale' })
  @ApiBody({ type: CreateBaseLocaleDTO, required: true })
  @ApiResponse({ status: HttpStatus.OK, type: BaseLocale })
  async createBaseLocale(
    @Req() req: Request,
    @Body() createBaseLocaleDTO: CreateBaseLocaleDTO,
    @Res() res: Response,
  ) {
    const newBaseLocale =
      await this.baseLocaleService.createOne(createBaseLocaleDTO);

    res.status(HttpStatus.OK).json(newBaseLocale);
  }

  @Post('create-demo')
  @ApiOperation({ summary: 'Create a base locale' })
  @ApiBody({ type: CreateDemoBaseLocaleDTO, required: true })
  @ApiResponse({ status: HttpStatus.OK, type: BaseLocale })
  async createDemoBaseLocale(
    @Req() req: Request,
    @Body() createBaseLocaleDTO: CreateBaseLocaleDTO,
    @Res() res: Response,
  ) {
    const newDemoBaseLocale =
      await this.baseLocaleService.createDemo(createBaseLocaleDTO);

    res.status(HttpStatus.OK).json(newDemoBaseLocale);
  }

  @Get(':baseLocaleId')
  @ApiOperation({ summary: 'Find Base_Locale by id' })
  @ApiParam({ name: 'baseLocaleId', required: true, type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    type: ExtendedBaseLocale,
  })
  @ApiHeader({
    name: 'Authorization',
    description: 'Base locale token (Token xxx)',
  })
  async findOneBaseLocale(@Req() req: CustomRequest, @Res() res: Response) {
    const baseLocale = await this.baseLocaleService.extendWithNumeros(
      req.baseLocale,
    );
    const response = req.isAdmin
      ? baseLocale
      : filterSensitiveFields(baseLocale);

    res.status(HttpStatus.OK).json(response);
  }

  @Put(':baseLocaleId')
  @ApiOperation({ summary: 'Update one base locale' })
  @ApiParam({ name: 'baseLocaleId', required: true, type: String })
  @ApiBody({ type: UpdateBaseLocaleDTO, required: true })
  @ApiResponse({ status: HttpStatus.OK, type: BaseLocale })
  @ApiHeader({
    name: 'Authorization',
    description: 'Base locale token (Token xxx)',
  })
  @UseGuards(AdminGuard)
  async updateOneBaseLocale(@Req() req: CustomRequest, @Res() res: Response) {
    const updatedBaseLocale = await this.baseLocaleService.updateOne(
      req.baseLocale,
      req.body,
    );

    res.status(HttpStatus.OK).json(updatedBaseLocale);
  }

  @Delete(':baseLocaleId')
  @ApiOperation({ summary: 'Delete one base locale' })
  @ApiParam({ name: 'baseLocaleId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiHeader({
    name: 'Authorization',
    description: 'Base locale token (Token xxx)',
  })
  @UseGuards(AdminGuard)
  async deleteOneBaseLocale(@Req() req: CustomRequest, @Res() res: Response) {
    const baseLocale = await this.baseLocaleService.deleteOne(req.baseLocale);
    res.status(HttpStatus.OK).json(baseLocale);
  }

  @Get(':baseLocaleId/parcelles')
  @ApiOperation({ summary: 'Find Base_Locale parcelles' })
  @ApiParam({ name: 'baseLocaleId', required: true, type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    isArray: true,
  })
  @ApiHeader({
    name: 'Authorization',
    description: 'Base locale token (Token xxx)',
  })
  async getBaseLocaleParcelles(
    @Req() req: CustomRequest,
    @Res() res: Response,
  ) {
    const parcelles = await this.baseLocaleService.getParcelles(req.baseLocale);

    res.status(HttpStatus.OK).json(parcelles);
  }

  @Put(':baseLocaleId/numeros/batch')
  @ApiOperation({ summary: 'Multi update numeros' })
  @ApiParam({ name: 'baseLocaleId', required: true, type: String })
  @ApiBody({ type: UpdateBatchNumeroDto, required: true })
  @ApiResponse({ status: HttpStatus.OK })
  @ApiHeader({
    name: 'Authorization',
    description: 'Base locale token (Token xxx)',
  })
  @UseGuards(AdminGuard)
  async batchNumeros(
    @Req() req: CustomRequest,
    @Body() updateBatchNumeroDto: UpdateBatchNumeroDto,
    @Res() res: Response,
  ) {
    const result: any = await this.numeroService.updateBatch(
      req.baseLocale,
      updateBatchNumeroDto,
    );
    res.status(HttpStatus.OK).json(result);
  }

  @Put(':baseLocaleId/numeros/batch/soft-delete')
  @ApiOperation({ summary: 'Multi soft delete numeros' })
  @ApiParam({ name: 'baseLocaleId', required: true, type: String })
  @ApiBody({ type: DeleteBatchNumeroDto, required: true })
  @ApiResponse({ status: HttpStatus.OK })
  @ApiHeader({
    name: 'Authorization',
    description: 'Base locale token (Token xxx)',
  })
  @UseGuards(AdminGuard)
  async softDeleteNumeros(
    @Req() req: CustomRequest,
    @Body() deleteBatchNumeroDto: DeleteBatchNumeroDto,
    @Res() res: Response,
  ) {
    const result: any = await this.numeroService.softDeleteBatch(
      req.baseLocale,
      deleteBatchNumeroDto,
    );
    res.status(HttpStatus.OK).json(result);
  }

  @Delete(':baseLocaleId/numeros/batch')
  @ApiOperation({ summary: 'Multi delete numeros' })
  @ApiParam({ name: 'baseLocaleId', required: true, type: String })
  @ApiBody({ type: DeleteBatchNumeroDto, required: true })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiHeader({
    name: 'Authorization',
    description: 'Base locale token (Token xxx)',
  })
  @UseGuards(AdminGuard)
  async deleteNumeros(
    @Req() req: CustomRequest,
    @Body() deleteBatchNumeroDto: DeleteBatchNumeroDto,
    @Res() res: Response,
  ) {
    await this.numeroService.deleteBatch(req.baseLocale, deleteBatchNumeroDto);
    res.status(HttpStatus.NO_CONTENT).send();
  }

  @Get(':baseLocaleId/voies')
  @ApiOperation({ summary: 'Find all Voie in Bal' })
  @ApiQuery({ name: 'isDelete', type: Boolean, required: false })
  @ApiParam({ name: 'baseLocaleId', required: true, type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    isArray: true,
  })
  @ApiHeader({
    name: 'Authorization',
    description: 'Base locale token (Token xxx)',
  })
  async findVoieByBal(
    @Req() req: CustomRequest,
    @Query('isDeleted') isDeleted: boolean = false,
    @Res() res: Response,
  ) {
    const voies: Voie[] = await this.voieService.findAllByBalId(
      req.baseLocale._id,
      isDeleted,
    );
    const extendedVoie: ExtendedVoie[] =
      await this.voieService.extendVoies(voies);
    res.status(HttpStatus.OK).json(extendedVoie);
  }

  @Post(':baseLocaleId/voies')
  @ApiOperation({ summary: 'Create Voie in Bal' })
  @ApiParam({ name: 'baseLocaleId', required: true, type: String })
  @ApiBody({ type: CreateVoieDto, required: true })
  @ApiResponse({ status: HttpStatus.CREATED, type: Voie, isArray: true })
  @ApiHeader({
    name: 'Authorization',
    description: 'Base locale token (Token xxx)',
  })
  async createVoie(
    @Req() req: CustomRequest,
    @Body() createVoieDto: CreateVoieDto,
    @Res() res: Response,
  ) {
    const voie: Voie = await this.voieService.create(
      req.baseLocale,
      createVoieDto,
    );
    res.status(HttpStatus.CREATED).json(voie);
  }

  @Get(':baseLocaleId/toponymes')
  @ApiOperation({ summary: 'Find all Toponymes in Bal' })
  @ApiQuery({ name: 'isDelete', type: Boolean, required: false })
  @ApiParam({ name: 'baseLocaleId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK, type: ExtentedToponyme, isArray: true })
  @ApiHeader({
    name: 'Authorization',
    description: 'Base locale token (Token xxx)',
  })
  async findToponymeByBal(
    @Req() req: CustomRequest,
    @Query('isDeleted') isDeleted: boolean = false,
    @Res() res: Response,
  ) {
    const toponymes: Toponyme[] = await this.toponymeService.findAllByBalId(
      req.baseLocale._id,
      isDeleted,
    );
    const extendedToponyme: ExtentedToponyme[] =
      await this.toponymeService.extendToponymes(toponymes);
    res.status(HttpStatus.OK).json(extendedToponyme);
  }

  @Post(':baseLocaleId/toponymes')
  @ApiOperation({ summary: 'Create Toponyme in Bal' })
  @ApiParam({ name: 'baseLocaleId', required: true, type: String })
  @ApiBody({ type: CreateToponymeDto, required: true })
  @ApiResponse({ status: HttpStatus.CREATED, type: Toponyme, isArray: true })
  @ApiHeader({
    name: 'Authorization',
    description: 'Base locale token (Token xxx)',
  })
  async create(
    @Req() req: CustomRequest,
    @Body() createToponymeDto: CreateToponymeDto,
    @Res() res: Response,
  ) {
    const toponyme: Toponyme = await this.toponymeService.create(
      req.baseLocale,
      createToponymeDto,
    );
    res.status(HttpStatus.CREATED).json(toponyme);
  }

  @Get(':baseLocaleId/csv')
  @ApiOperation({ summary: 'Get Bal csv file' })
  @ApiParam({ name: 'baseLocaleId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK })
  async getCsvBal(@Req() req: CustomRequest, @Res() res: Response) {
    const csvFile: string = await this.baseLocaleService.exportToCsv(
      req.baseLocale,
    );
    res.status(HttpStatus.OK).attachment('bal.csv').type('csv').send(csvFile);
  }

  @Get(':baseLocaleId/voies/csv')
  @ApiOperation({ summary: 'Get voies csv file' })
  @ApiParam({ name: 'baseLocaleId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK })
  async getCsvVoies(@Req() req: CustomRequest, @Res() res: Response) {
    const csvFile: string = await this.baseLocaleService.exportVoiesToCsv(
      req.baseLocale,
    );
    res
      .status(HttpStatus.OK)
      .attachment('liste-des-voies.csv')
      .type('csv')
      .send(csvFile);
  }
}
