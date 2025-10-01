import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  ParseBoolPipe,
  ParseFilePipeBuilder,
  Post,
  Put,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  forwardRef,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';

import { Toponyme } from '@/shared/entities/toponyme.entity';
import { BaseLocale } from '@/shared/entities/base_locale.entity';
import { Voie } from '@/shared/entities/voie.entity';
import { PublicationService } from '@/shared/modules/publication/publication.service';
import { getEditorUrl } from '@/shared/utils/mailer.utils';

import { BaseLocaleService } from '@/modules/base_locale/base_locale.service';
import { CreateBaseLocaleDTO } from '@/modules/base_locale/dto/create_base_locale.dto';
import { AdminGuard } from '@/lib/guards/admin.guard';
import { CustomRequest } from '@/lib/types/request.type';
import { UpdateBatchNumeroDTO } from '@/modules/numeros/dto/update_batch_numero.dto';
import { NumeroService } from '@/modules/numeros/numero.service';
import { DeleteBatchNumeroDTO } from '@/modules/numeros/dto/delete_batch_numero.dto';
import { VoieService } from '@/modules/voie/voie.service';
import { ToponymeService } from '@/modules/toponyme/toponyme.service';
import { CreateVoieDTO } from '@/modules/voie/dto/create_voie.dto';
import { ExtentedToponymeDTO } from '@/modules/toponyme/dto/extended_toponyme.dto';
import { CreateToponymeDTO } from '@/modules/toponyme/dto/create_toponyme.dto';
import { filterSensitiveFields } from '@/modules/base_locale/utils/base_locale.utils';
import { ExtendedBaseLocaleDTO } from './dto/extended_base_locale.dto';
import { ExtendedVoieDTO, VoieMetas } from '../voie/dto/extended_voie.dto';
import { UpdateBaseLocaleDTO } from './dto/update_base_locale.dto';
import { UpdateBaseLocaleDemoDTO } from './dto/update_base_locale_demo.dto';
import { CreateDemoBaseLocaleDTO } from './dto/create_demo_base_locale.dto';
import { PageBaseLocaleDTO } from './dto/page_base_locale.dto';
import { SearchBaseLocalQuery } from './dto/search_base_locale.query';
import {
  SearchQueryPipe,
  SearchQueryTransformed,
} from './pipe/search_query.pipe';
import { ImportFileBaseLocaleDTO } from './dto/import_file_base_locale.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { RecoverBaseLocaleDTO } from './dto/recover_base_locale.dto';
import { AllDeletedInBalDTO } from './dto/all_deleted_in_bal.dto';
import { BatchNumeroResponseDTO } from '../numeros/dto/batch_numero_response.dto';
import { isSuperAdmin } from '@/lib/utils/is-admin.utils';
import { SearchNumeroDTO } from '../numeros/dto/search_numero.dto';
import { Numero } from '@/shared/entities/numero.entity';
import { filterComments } from '@/shared/utils/filter.utils';

@ApiTags('bases-locales')
@Controller('bases-locales')
export class BaseLocaleController {
  constructor(
    private baseLocaleService: BaseLocaleService,
    private publicationService: PublicationService,
    @Inject(forwardRef(() => NumeroService))
    private numeroService: NumeroService,
    @Inject(forwardRef(() => VoieService))
    private voieService: VoieService,
    @Inject(forwardRef(() => ToponymeService))
    private toponymeService: ToponymeService,
  ) {}

  @Post('')
  @ApiOperation({
    summary: 'Create a base locale',
    operationId: 'createBaseLocale',
  })
  @ApiBody({ type: CreateBaseLocaleDTO, required: true })
  @ApiResponse({ status: HttpStatus.OK, type: BaseLocale })
  async createBaseLocale(
    @Body() createBaseLocaleDTO: CreateBaseLocaleDTO,
    @Res() res: Response,
  ) {
    const newBaseLocale =
      await this.baseLocaleService.createOne(createBaseLocaleDTO);

    res.status(HttpStatus.OK).json(newBaseLocale);
  }

  @Post('create-demo')
  @ApiOperation({
    summary: 'Create a base locale',
    operationId: 'createBaseLocaleDemo',
  })
  @ApiBody({ type: CreateDemoBaseLocaleDTO, required: true })
  @ApiResponse({ status: HttpStatus.OK, type: BaseLocale })
  async createDemoBaseLocale(
    @Body() createDemoBaseLocaleDTO: CreateDemoBaseLocaleDTO,
    @Res() res: Response,
  ) {
    const newDemoBaseLocale = await this.baseLocaleService.createDemo(
      createDemoBaseLocaleDTO,
    );

    res.status(HttpStatus.OK).json(newDemoBaseLocale);
  }

  @Get('/search')
  @ApiOperation({
    summary: 'Search BAL by filters',
    operationId: 'searchBaseLocale',
  })
  @ApiQuery({ type: SearchBaseLocalQuery })
  @ApiResponse({
    status: HttpStatus.OK,
    type: PageBaseLocaleDTO,
  })
  @ApiBearerAuth('admin-token')
  async searchBaseLocale(
    @Req() req: CustomRequest,
    @Query(SearchQueryPipe)
    { filters, email, limit, offset }: SearchQueryTransformed,
    @Res() res: Response,
  ) {
    const basesLocales: BaseLocale[] = await this.baseLocaleService.searchMany(
      filters,
      email,
      limit,
      offset,
    );
    const count: number = await this.baseLocaleService.count(filters);
    const results: Array<
      ExtendedBaseLocaleDTO | Omit<ExtendedBaseLocaleDTO, 'token' | 'emails'>
    > = [];

    for (const bal of basesLocales) {
      const balExtended: ExtendedBaseLocaleDTO =
        await this.baseLocaleService.extendWithNumeros(bal);
      const balExtendedFiltered:
        | ExtendedBaseLocaleDTO
        | Omit<ExtendedBaseLocaleDTO, 'token' | 'emails'> = isSuperAdmin(req)
        ? balExtended
        : filterSensitiveFields(balExtended);
      results.push(balExtendedFiltered);
    }
    const page: PageBaseLocaleDTO = {
      offset,
      limit,
      count,
      results,
    };
    res.status(HttpStatus.OK).json(page);
  }

  @Get(':baseLocaleId')
  @ApiOperation({
    summary: 'Find Base_Locale by id',
    operationId: 'findBaseLocale',
  })
  @ApiQuery({ name: 'isExist', required: false, type: Boolean })
  @ApiParam({ name: 'baseLocaleId', required: true, type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    type: ExtendedBaseLocaleDTO,
  })
  @ApiBearerAuth('admin-token')
  async findOneBaseLocale(
    @Req() req: CustomRequest,
    @Query('isExist', new ParseBoolPipe({ optional: true })) isExist: boolean,
    @Res() res: Response,
  ) {
    if (isExist && req.baseLocale.deletedAt) {
      throw new HttpException(
        `BaseLocale ${req.baseLocale.id} est supprimé`,
        HttpStatus.NOT_FOUND,
      );
    }
    const baseLocale = await this.baseLocaleService.extendWithNumeros(
      req.baseLocale,
    );
    const response = req.isAdmin
      ? baseLocale
      : filterSensitiveFields(baseLocale);

    res.status(HttpStatus.OK).json(response);
  }

  @Put(':baseLocaleId')
  @ApiOperation({
    summary: 'Update one base locale',
    operationId: 'updateBaseLocale',
  })
  @ApiParam({ name: 'baseLocaleId', required: true, type: String })
  @ApiBody({ type: UpdateBaseLocaleDTO, required: true })
  @ApiResponse({ status: HttpStatus.OK, type: BaseLocale })
  @ApiBearerAuth('admin-token')
  @UseGuards(AdminGuard)
  async updateOneBaseLocale(
    @Req() req: CustomRequest,
    @Body() updateBaseLocaleDTO: UpdateBaseLocaleDTO,
    @Res() res: Response,
  ) {
    const updatedBaseLocale = await this.baseLocaleService.updateOne(
      req.baseLocale,
      updateBaseLocaleDTO,
    );

    res.status(HttpStatus.OK).json(updatedBaseLocale);
  }

  @Delete(':baseLocaleId')
  @ApiOperation({
    summary: 'Delete one base locale',
    operationId: 'deleteBaseLocale',
  })
  @ApiParam({ name: 'baseLocaleId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiBearerAuth('admin-token')
  @UseGuards(AdminGuard)
  async deleteOneBaseLocale(@Req() req: CustomRequest, @Res() res: Response) {
    await this.baseLocaleService.deleteOne(req.baseLocale);
    res.status(HttpStatus.NO_CONTENT).json(true);
  }

  @Put(':baseLocaleId/transform-to-draft')
  @ApiOperation({
    summary: 'Update one base locale status to draft',
    operationId: 'updateBaseLocaleDemoToDraft',
  })
  @ApiParam({ name: 'baseLocaleId', required: true, type: String })
  @ApiBody({ type: UpdateBaseLocaleDemoDTO, required: true })
  @ApiResponse({ status: HttpStatus.OK, type: BaseLocale })
  @ApiBearerAuth('admin-token')
  @UseGuards(AdminGuard)
  async updateStatusToDraft(
    @Req() req: CustomRequest,
    @Body() updateBaseLocaleDemoDTO: UpdateBaseLocaleDemoDTO,
    @Res() res: Response,
  ) {
    const updatedBaseLocale: BaseLocale =
      await this.baseLocaleService.updateStatusToDraft(
        req.baseLocale,
        updateBaseLocaleDemoDTO,
      );

    res.status(HttpStatus.OK).json(updatedBaseLocale);
  }

  @Post(':baseLocaleId/upload')
  @ApiOperation({
    summary: 'Upload a CSV BAL file',
    operationId: 'uploadCsvBalFile',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  @ApiParam({ name: 'baseLocaleId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK, type: ImportFileBaseLocaleDTO })
  @ApiBearerAuth('admin-token')
  @UseGuards(AdminGuard)
  async uploadBALFile(
    @Req() req: CustomRequest,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: 'text/csv',
        })
        .addMaxSizeValidator({
          maxSize: 50000000, // 50 Mo
        })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        }),
    )
    file: Express.Multer.File,
    @Res() res: Response,
  ) {
    const importStatus: ImportFileBaseLocaleDTO =
      await this.baseLocaleService.importFile(req.baseLocale, file.buffer);

    res.status(HttpStatus.OK).json(importStatus);
  }

  @Post('recovery')
  @ApiOperation({
    summary: 'Recover BAL access',
    operationId: 'recoveryBasesLocales',
  })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  async recoverBALAccess(
    @Body() recoverBaseLocaleDTO: RecoverBaseLocaleDTO,
    @Res() res: Response,
  ) {
    await this.baseLocaleService.recoverAccess(recoverBaseLocaleDTO);

    res.sendStatus(HttpStatus.NO_CONTENT);
  }

  @Get(':baseLocaleId/:token/recovery')
  @ApiOperation({
    summary: 'Restore deleted BAL',
    operationId: 'recoveryBaseLocale',
  })
  @ApiParam({ name: 'baseLocaleId', required: true, type: String })
  @ApiParam({ name: 'token', required: true, type: String })
  @ApiResponse({ status: HttpStatus.TEMPORARY_REDIRECT })
  async BALRecovery(@Req() req: CustomRequest, @Res() res: Response) {
    if (req.baseLocale.token !== req.params.token) {
      return res.sendStatus(403);
    }

    await this.baseLocaleService.restore(req.baseLocale);

    const editorUrl = getEditorUrl(req.baseLocale);
    res.redirect(307, editorUrl);
  }

  @Post(':baseLocaleId/populate')
  @ApiOperation({
    summary: 'Populate Base Locale',
    operationId: 'populateBaseLocale',
  })
  @ApiParam({ name: 'baseLocaleId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK, type: BaseLocale })
  @ApiBearerAuth('admin-token')
  @UseGuards(AdminGuard)
  async populate(@Req() req: CustomRequest, @Res() res: Response) {
    const populatedBAL = await this.baseLocaleService.extractAndPopulate(
      req.baseLocale,
    );

    res.status(HttpStatus.OK).json(populatedBAL);
  }

  @Post(':baseLocaleId/is_populating')
  @ApiOperation({
    summary: 'Is populate Base Locale',
    operationId: 'isPopulatingBaseLocale',
  })
  @ApiParam({ name: 'baseLocaleId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK, type: Boolean })
  @ApiBearerAuth('admin-token')
  @UseGuards(AdminGuard)
  async isPopulating(@Req() req: CustomRequest, @Res() res: Response) {
    const isPopulating = await this.baseLocaleService.isPopulating(
      req.baseLocale,
    );

    res.status(HttpStatus.OK).json(isPopulating);
  }

  @Post(':baseLocaleId/token/renew')
  @ApiOperation({
    summary: 'Renew Base Locale token',
    operationId: 'renewTokenBaseLocale',
  })
  @ApiParam({ name: 'baseLocaleId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK, type: BaseLocale })
  @ApiBearerAuth('admin-token')
  @UseGuards(AdminGuard)
  async renewToken(@Req() req: CustomRequest, @Res() res: Response) {
    const baseLocale = await this.baseLocaleService.renewToken(req.baseLocale);

    res.status(HttpStatus.OK).json(baseLocale);
  }

  @Get(':baseLocaleId/parcelles')
  @ApiOperation({
    summary: 'Find Base_Locale parcelles',
    operationId: 'findBaseLocaleParcelles',
  })
  @ApiParam({ name: 'baseLocaleId', required: true, type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    type: String,
    isArray: true,
  })
  async getBaseLocaleParcelles(
    @Req() req: CustomRequest,
    @Res() res: Response,
  ) {
    const parcelles: string[] = await this.baseLocaleService.getParcelles(
      req.baseLocale,
    );

    res.status(HttpStatus.OK).json(parcelles);
  }

  @Post(':baseLocaleId/sync/exec')
  @ApiOperation({
    summary: 'Publish base locale',
    operationId: 'publishBaseLocale',
  })
  @ApiParam({ name: 'baseLocaleId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK, type: BaseLocale })
  @ApiBearerAuth('admin-token')
  @UseGuards(AdminGuard)
  async publishBaseLocale(@Req() req: CustomRequest, @Res() res: Response) {
    try {
      const result = await this.baseLocaleService.forcePublish(
        req.baseLocale.id,
      );
      if (!result.success) {
        throw new HttpException(result.error, HttpStatus.PRECONDITION_FAILED);
      }
      const baseLocale = await this.baseLocaleService.findOneOrFail(
        req.baseLocale.id,
      );
      res.status(HttpStatus.OK).json(baseLocale);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.PRECONDITION_FAILED);
    }
  }

  @Post(':baseLocaleId/sync/pause')
  @ApiOperation({
    summary: 'Update isPaused sync BAL to true',
    operationId: 'pauseBaseLocale',
  })
  @ApiParam({ name: 'baseLocaleId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK, type: Boolean })
  @ApiBearerAuth('admin-token')
  @UseGuards(AdminGuard)
  async pauseBaseLocale(@Req() req: CustomRequest, @Res() res: Response) {
    if (!req.baseLocale.sync.status) {
      throw new HttpException(
        'Le statut de synchronisation doit être actif pour modifier l’état de pause',
        HttpStatus.PRECONDITION_FAILED,
      );
    }
    await this.publicationService.pause(req.baseLocale.id);
    res.status(HttpStatus.OK).json(true);
  }

  @Post(':baseLocaleId/sync/resume')
  @ApiOperation({
    summary: 'Update isPaused sync BAL to false',
    operationId: 'resumeBaseLocale',
  })
  @ApiParam({ name: 'baseLocaleId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK, type: Boolean })
  @ApiBearerAuth('admin-token')
  @UseGuards(AdminGuard)
  async resumeBaseLocale(@Req() req: CustomRequest, @Res() res: Response) {
    if (!req.baseLocale.sync.status) {
      throw new HttpException(
        'Le statut de synchronisation doit être actif pour modifier l’état de pause',
        HttpStatus.PRECONDITION_FAILED,
      );
    }
    await this.publicationService.resume(req.baseLocale.id);
    res.status(HttpStatus.OK).json(true);
  }

  @Get(':baseLocaleId/all/deleted')
  @ApiOperation({
    summary: 'Find all model deleted in Bal',
    operationId: 'findAllDeleted',
  })
  @ApiParam({ name: 'baseLocaleId', required: true, type: String })
  @ApiResponse({
    type: AllDeletedInBalDTO,
    status: HttpStatus.OK,
  })
  @ApiBearerAuth('admin-token')
  async findAllDeletedByBal(@Req() req: CustomRequest, @Res() res: Response) {
    const allDeleted: AllDeletedInBalDTO =
      await this.baseLocaleService.findAllDeletedByBal(req.baseLocale);
    res.status(HttpStatus.OK).json(allDeleted);
  }

  @Put(':baseLocaleId/numeros')
  @ApiOperation({
    summary: 'Search numero',
    operationId: 'searchNumeros',
  })
  @ApiParam({ name: 'baseLocaleId', required: true, type: String })
  @ApiBody({ type: SearchNumeroDTO, required: true })
  @ApiResponse({ status: HttpStatus.OK, type: Numero, isArray: true })
  @ApiBearerAuth('admin-token')
  @UseGuards(AdminGuard)
  async searchNumeros(
    @Req() req: CustomRequest,
    @Body() searchNumeroDTO: SearchNumeroDTO,
    @Res() res: Response,
  ) {
    const result: Numero[] =
      await this.numeroService.findManyWherePositionInPolygon(
        req.baseLocale.id,
        searchNumeroDTO.polygon,
      );
    res.status(HttpStatus.OK).json(result);
  }

  @Put(':baseLocaleId/numeros/batch')
  @ApiOperation({
    summary: 'Multi update numeros',
    operationId: 'updateNumeros',
  })
  @ApiParam({ name: 'baseLocaleId', required: true, type: String })
  @ApiBody({ type: UpdateBatchNumeroDTO, required: true })
  @ApiResponse({ status: HttpStatus.OK, type: BatchNumeroResponseDTO })
  @ApiBearerAuth('admin-token')
  @UseGuards(AdminGuard)
  async batchNumeros(
    @Req() req: CustomRequest,
    @Body() updateBatchNumeroDto: UpdateBatchNumeroDTO,
    @Res() res: Response,
  ) {
    const result: BatchNumeroResponseDTO = await this.numeroService.updateBatch(
      req.baseLocale,
      updateBatchNumeroDto,
    );
    res.status(HttpStatus.OK).json(result);
  }

  @Put(':baseLocaleId/numeros/batch/soft-delete')
  @ApiOperation({
    summary: 'Multi soft delete numeros',
    operationId: 'softDeleteNumeros',
  })
  @ApiParam({ name: 'baseLocaleId', required: true, type: String })
  @ApiBody({ type: DeleteBatchNumeroDTO, required: true })
  @ApiResponse({ status: HttpStatus.OK, type: BatchNumeroResponseDTO })
  @ApiBearerAuth('admin-token')
  @UseGuards(AdminGuard)
  async softDeleteNumeros(
    @Req() req: CustomRequest,
    @Body() deleteBatchNumeroDto: DeleteBatchNumeroDTO,
    @Res() res: Response,
  ) {
    await this.numeroService.softDeleteBatch(
      req.baseLocale,
      deleteBatchNumeroDto,
    );
    res.sendStatus(HttpStatus.NO_CONTENT);
  }

  @Delete(':baseLocaleId/numeros/batch')
  @ApiOperation({
    summary: 'Multi delete numeros',
    operationId: 'deleteNumeros',
  })
  @ApiParam({ name: 'baseLocaleId', required: true, type: String })
  @ApiBody({ type: DeleteBatchNumeroDTO, required: true })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiBearerAuth('admin-token')
  @UseGuards(AdminGuard)
  async deleteNumeros(
    @Req() req: CustomRequest,
    @Body() deleteBatchNumeroDto: DeleteBatchNumeroDTO,
    @Res() res: Response,
  ) {
    await this.numeroService.deleteBatch(req.baseLocale, deleteBatchNumeroDto);
    res.status(HttpStatus.NO_CONTENT).send();
  }

  @Get(':baseLocaleId/voies')
  @ApiOperation({
    summary: 'Find all Voie in Bal',
    operationId: 'findBaseLocaleVoies',
  })
  @ApiParam({ name: 'baseLocaleId', required: true, type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    type: ExtendedVoieDTO,
    isArray: true,
  })
  @ApiBearerAuth('admin-token')
  async findVoieByBal(@Req() req: CustomRequest, @Res() res: Response) {
    const voies: Voie[] = await this.voieService.findMany({
      balId: req.baseLocale.id,
    });

    const extendedVoie: ExtendedVoieDTO[] = await this.voieService.extendVoies(
      req.baseLocale.id,
      voies,
    );
    const voiesFiltered: ExtendedVoieDTO[] = extendedVoie.map((v) =>
      filterComments(v, !req.isAdmin),
    );
    res.status(HttpStatus.OK).json(voiesFiltered);
  }

  @Get(':baseLocaleId/voies/geojson')
  @ApiOperation({
    summary: 'get geojson of filaires voies',
    operationId: 'findFilairesVoiesGeoJSON',
  })
  @ApiParam({ name: 'baseLocaleId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK })
  async findFilairesVoiesGeoJSON(
    @Req() req: CustomRequest,
    @Res() res: Response,
  ) {
    const filaireGeoJSON: GeoJSON.FeatureCollection =
      await this.baseLocaleService.getGeoJSONFilairesDeVoie(req.baseLocale);

    const file = Buffer.from(JSON.stringify(filaireGeoJSON), 'utf-8');

    res
      .status(HttpStatus.OK)
      .attachment(`voies_${req.baseLocale.commune}.geojson`)
      .type('application/json')
      .send(file);
  }

  @Get(':baseLocaleId/voies/metas')
  @ApiOperation({
    summary: 'Find all Metas Voie in Bal',
    operationId: 'findVoieMetasByBal',
  })
  @ApiParam({ name: 'baseLocaleId', required: true, type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    type: VoieMetas,
    isArray: true,
  })
  @ApiBearerAuth('admin-token')
  @UseGuards(AdminGuard)
  async findVoieMetasByBal(@Req() req: CustomRequest, @Res() res: Response) {
    const voiesMetas: VoieMetas[] = await this.voieService.findVoiesMetas(
      req.baseLocale.id,
    );

    res.status(HttpStatus.OK).json(voiesMetas);
  }

  @Post(':baseLocaleId/voies')
  @ApiOperation({ summary: 'Create Voie in Bal', operationId: 'createVoie' })
  @ApiParam({ name: 'baseLocaleId', required: true, type: String })
  @ApiBody({ type: CreateVoieDTO, required: true })
  @ApiResponse({ status: HttpStatus.CREATED, type: Voie })
  @ApiBearerAuth('admin-token')
  @UseGuards(AdminGuard)
  async createVoie(
    @Req() req: CustomRequest,
    @Body() createVoieDto: CreateVoieDTO,
    @Res() res: Response,
  ) {
    const voie: Voie = await this.voieService.create(
      req.baseLocale,
      createVoieDto,
    );
    res.status(HttpStatus.CREATED).json(voie);
  }

  @Get(':baseLocaleId/toponymes')
  @ApiOperation({
    summary: 'Find all Toponymes in Bal',
    operationId: 'findBaseLocaleToponymes',
  })
  @ApiParam({ name: 'baseLocaleId', required: true, type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    type: ExtentedToponymeDTO,
    isArray: true,
  })
  @ApiBearerAuth('admin-token')
  async findToponymeByBal(@Req() req: CustomRequest, @Res() res: Response) {
    const toponymes: Toponyme[] = await this.toponymeService.findMany({
      balId: req.baseLocale.id,
    });
    const extendedToponyme: ExtentedToponymeDTO[] =
      await this.toponymeService.extendToponymes(toponymes);
    res.status(HttpStatus.OK).json(extendedToponyme);
  }

  @Post(':baseLocaleId/toponymes')
  @ApiOperation({
    summary: 'Create Toponyme in Bal',
    operationId: 'createToponyme',
  })
  @ApiParam({ name: 'baseLocaleId', required: true, type: String })
  @ApiBody({ type: CreateToponymeDTO, required: true })
  @ApiResponse({ status: HttpStatus.CREATED, type: Toponyme })
  @ApiBearerAuth('admin-token')
  @UseGuards(AdminGuard)
  async create(
    @Req() req: CustomRequest,
    @Body() createToponymeDto: CreateToponymeDTO,
    @Res() res: Response,
  ) {
    const toponyme: Toponyme = await this.toponymeService.create(
      req.baseLocale,
      createToponymeDto,
    );
    res.status(HttpStatus.CREATED).json(toponyme);
  }
}
