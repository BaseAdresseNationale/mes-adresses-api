import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Inject,
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
import { Request, Response } from 'express';

import { Toponyme } from '@/shared/schemas/toponyme/toponyme.schema';
import { Voie } from '@/shared/schemas/voie/voie.schema';
import { PublicationService } from '@/shared/modules/publication/publication.service';

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
import { filterSensitiveFields } from '@/modules/base_locale/utils/base_locale.utils';
import { ExtendedBaseLocale } from './dto/extended_base_locale';
import { ExtendedVoie } from '../voie/dto/extended_voie.dto';
import { UpdateBaseLocaleDTO } from './dto/update_base_locale.dto';
import { UpdateBaseLocaleDemoDTO } from './dto/update_base_locale_demo.dto';
import { BaseLocale } from '@/shared/schemas/base_locale/base_locale.schema';
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
import { getEditorUrl } from '@/shared/modules/mailer/mailer.utils';
import { AllDeletedInBalDTO } from './dto/all_deleted_in_bal.dto';

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
    @Req() req: Request,
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
    @Req() req: Request,
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
    @Query(SearchQueryPipe) { filters, limit, offset }: SearchQueryTransformed,
    @Res() res: Response,
  ) {
    const basesLocales: BaseLocale[] = await this.baseLocaleService.findMany(
      filters,
      null,
      limit,
      offset,
    );
    const count: number = await this.baseLocaleService.count(filters);
    const results: Omit<ExtendedBaseLocale, 'token' | 'emails'>[] = [];
    for (const bal of basesLocales) {
      const balExtended: ExtendedBaseLocale =
        await this.baseLocaleService.extendWithNumeros(bal);
      const balExtendedFiltered: Omit<ExtendedBaseLocale, 'token' | 'emails'> =
        filterSensitiveFields(balExtended);
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
  @ApiParam({ name: 'baseLocaleId', required: true, type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    type: ExtendedBaseLocale,
  })
  @ApiBearerAuth('admin-token')
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

    res.status(HttpStatus.NO_CONTENT).json(true);
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

    const restoredBaseLocale = await this.baseLocaleService.recovery(
      req.baseLocale,
    );

    const editorUrl = getEditorUrl(restoredBaseLocale);
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
    isArray: true,
  })
  async getBaseLocaleParcelles(
    @Req() req: CustomRequest,
    @Res() res: Response,
  ) {
    const parcelles = await this.baseLocaleService.getParcelles(req.baseLocale);

    res.status(HttpStatus.OK).json(parcelles);
  }

  @Post(':baseLocaleId/sync/exec')
  @ApiOperation({
    summary: 'Publish base locale',
    operationId: 'publishBaseLocale',
  })
  @ApiResponse({ status: HttpStatus.OK, type: BaseLocale })
  @ApiBearerAuth('admin-token')
  @UseGuards(AdminGuard)
  async publishBaseLocale(@Req() req: CustomRequest, @Res() res: Response) {
    const baseLocale = await this.publicationService.exec(req.baseLocale._id, {
      force: true,
    });
    res.status(HttpStatus.OK).json(baseLocale);
  }

  @Post(':baseLocaleId/sync/pause')
  @ApiOperation({
    summary: 'Update isPaused sync BAL to true',
    operationId: 'pauseBaseLocale',
  })
  @ApiResponse({ status: HttpStatus.OK, type: BaseLocale })
  @ApiBearerAuth('admin-token')
  @UseGuards(AdminGuard)
  async pauseBaseLocale(@Req() req: CustomRequest, @Res() res: Response) {
    const baseLocale = await this.publicationService.pause(req.baseLocale._id);
    res.status(HttpStatus.OK).json(baseLocale);
  }

  @Post(':baseLocaleId/sync/resume')
  @ApiOperation({
    summary: 'Update isPaused sync BAL to false',
    operationId: 'resumeBaseLocale',
  })
  @ApiResponse({ status: HttpStatus.OK, type: BaseLocale })
  @ApiBearerAuth('admin-token')
  @UseGuards(AdminGuard)
  async resumeBaseLocale(@Req() req: CustomRequest, @Res() res: Response) {
    const baseLocale = await this.publicationService.resume(req.baseLocale._id);
    res.status(HttpStatus.OK).json(baseLocale);
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
    isArray: true,
  })
  @ApiBearerAuth('admin-token')
  async findAllDeletedByBal(@Req() req: CustomRequest, @Res() res: Response) {
    const allDeleted: AllDeletedInBalDTO =
      await this.baseLocaleService.findAllDeletedByBal(req.baseLocale);
    res.status(HttpStatus.OK).json(allDeleted);
  }

  @Put(':baseLocaleId/numeros/batch')
  @ApiOperation({
    summary: 'Multi update numeros',
    operationId: 'updateNumeros',
  })
  @ApiParam({ name: 'baseLocaleId', required: true, type: String })
  @ApiBody({ type: UpdateBatchNumeroDto, required: true })
  @ApiResponse({ status: HttpStatus.OK })
  @ApiBearerAuth('admin-token')
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
  @ApiOperation({
    summary: 'Multi soft delete numeros',
    operationId: 'softDeleteNumeros',
  })
  @ApiParam({ name: 'baseLocaleId', required: true, type: String })
  @ApiBody({ type: DeleteBatchNumeroDto, required: true })
  @ApiResponse({ status: HttpStatus.OK })
  @ApiBearerAuth('admin-token')
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
  @ApiOperation({
    summary: 'Multi delete numeros',
    operationId: 'deleteNumeros',
  })
  @ApiParam({ name: 'baseLocaleId', required: true, type: String })
  @ApiBody({ type: DeleteBatchNumeroDto, required: true })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiBearerAuth('admin-token')
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
  @ApiOperation({
    summary: 'Find all Voie in Bal',
    operationId: 'findBaseLocaleVoies',
  })
  @ApiParam({ name: 'baseLocaleId', required: true, type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    isArray: true,
  })
  @ApiBearerAuth('admin-token')
  async findVoieByBal(@Req() req: CustomRequest, @Res() res: Response) {
    const voies: Voie[] = await this.voieService.findMany({
      _bal: req.baseLocale._id,
      _deleted: null,
    });
    const extendedVoie: ExtendedVoie[] =
      await this.voieService.extendVoies(voies);
    res.status(HttpStatus.OK).json(extendedVoie);
  }

  @Post(':baseLocaleId/voies')
  @ApiOperation({ summary: 'Create Voie in Bal', operationId: 'createVoie' })
  @ApiParam({ name: 'baseLocaleId', required: true, type: String })
  @ApiBody({ type: CreateVoieDto, required: true })
  @ApiResponse({ status: HttpStatus.CREATED, type: Voie, isArray: true })
  @ApiBearerAuth('admin-token')
  @UseGuards(AdminGuard)
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
  @ApiOperation({
    summary: 'Find all Toponymes in Bal',
    operationId: 'findBaseLocaleToponymes',
  })
  @ApiParam({ name: 'baseLocaleId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK, type: ExtentedToponyme, isArray: true })
  @ApiBearerAuth('admin-token')
  async findToponymeByBal(@Req() req: CustomRequest, @Res() res: Response) {
    const toponymes: Toponyme[] = await this.toponymeService.findMany({
      _bal: req.baseLocale._id,
      _deleted: null,
    });
    const extendedToponyme: ExtentedToponyme[] =
      await this.toponymeService.extendToponymes(toponymes);
    res.status(HttpStatus.OK).json(extendedToponyme);
  }

  @Post(':baseLocaleId/toponymes')
  @ApiOperation({
    summary: 'Create Toponyme in Bal',
    operationId: 'createToponyme',
  })
  @ApiParam({ name: 'baseLocaleId', required: true, type: String })
  @ApiBody({ type: CreateToponymeDto, required: true })
  @ApiResponse({ status: HttpStatus.CREATED, type: Toponyme, isArray: true })
  @ApiBearerAuth('admin-token')
  @UseGuards(AdminGuard)
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
