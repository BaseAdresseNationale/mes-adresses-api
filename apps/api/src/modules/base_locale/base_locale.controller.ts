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
import { BaseLocaleService } from './base_locale.service';
import { CreateBaseLocaleDTO } from './dto/create_base_locale.dto';
import { AdminGuard } from '@/lib/guards/admin.guard';
import { CustomRequest } from '@/lib/types/request.type';
import { UpdateBatchNumeroDto } from '../numeros/dto/update_batch_numero.dto';
import { NumeroService } from '../numeros/numero.service';
import { DeleteBatchNumeroDto } from '../numeros/dto/delete_batch_numero.dto';
import { ExtendedVoie } from '../voie/dto/extended_voie.dto';
import { VoieService } from '../voie/voie.service';
import { ToponymeService } from '../toponyme/toponyme.service';
import { Voie } from '../voie/schema/voie.schema';
import { CreateVoieDto } from '../voie/dto/create_voie.dto';
import { ExtentedToponyme } from '../toponyme/dto/extended_toponyme.dto';
import { Toponyme } from '@/shared/schemas/toponyme/toponyme.schema';
import { CreateToponymeDto } from '../toponyme/dto/create_toponyme.dto';

@ApiTags('bases_locales')
@Controller('bases_locales')
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

  @Get('')
  @ApiResponse({ status: 200 })
  async getBasesLocales(@Req() req: Request, @Res() res: Response) {
    const basesLocales = await this.baseLocaleService.findMany();

    res.status(HttpStatus.OK).json(basesLocales);
  }

  @Post('')
  @ApiBody({ type: CreateBaseLocaleDTO, required: true })
  @ApiResponse({ status: 200 })
  async createBaseLocale(
    @Req() req: Request,
    @Body() createBaseLocaleDTO: CreateBaseLocaleDTO,
    @Res() res: Response,
  ) {
    const newBaseLocale =
      await this.baseLocaleService.createOne(createBaseLocaleDTO);

    res.status(HttpStatus.OK).json(newBaseLocale);
  }

  @Put(':baseLocaleId/numeros/batch')
  @ApiOperation({ summary: 'Multi update numeros' })
  @ApiParam({ name: 'baseLocaleId', required: true, type: String })
  @ApiBody({ type: UpdateBatchNumeroDto, required: true })
  @ApiResponse({ status: HttpStatus.OK })
  @ApiHeader({ name: 'Token' })
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
  @ApiHeader({ name: 'Token' })
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
  @ApiHeader({ name: 'Token' })
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
  @ApiResponse({ status: HttpStatus.OK, type: ExtendedVoie, isArray: true })
  @ApiHeader({ name: 'Token' })
  async findVoieByBal(
    @Req() req: CustomRequest,
    @Query() isDeleted: boolean = false,
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
  @ApiHeader({ name: 'Token' })
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
  @ApiHeader({ name: 'Token' })
  async findToponymeByBal(
    @Req() req: CustomRequest,
    @Query() isDeleted: boolean = false,
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
  @ApiHeader({ name: 'Token' })
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
}
