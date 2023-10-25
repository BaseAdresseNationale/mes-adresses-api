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
import { CustomRequest } from '@/lib/types/request.type';
import { AdminGuard } from '@/lib/guards/admin.guard';
import { NumeroService } from './numero.service';
import { Numero } from './schema/numero.schema';
import { UpdateNumeroDto } from './dto/update_numero.dto';
import { filterSensitiveFields } from './numero.utils';
import { NumeroPopulate } from '@/modules/numeros/schema/numero.populate';
import { CreateNumeroDto } from '@/modules/numeros/dto/create_numero.dto';
import { UpdateBatchNumeroDto } from '@/modules/numeros/dto/update_batch_numero.dto';
import { DeleteBatchNumeroDto } from '@/modules/numeros/dto/delete_batch_numero.dto';

@ApiTags('numeros')
@Controller()
export class NumeroController {
  constructor(private numeroService: NumeroService) {}

  @Get('numeros/:numeroId')
  @ApiOperation({ summary: 'Find the numero by id' })
  @ApiParam({ name: 'numeroId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK, type: Numero })
  @ApiHeader({ name: 'Token' })
  find(@Req() req: CustomRequest, @Res() res: Response) {
    const numero: Numero = <Numero>(
      filterSensitiveFields(req.numero, !req.isAdmin)
    );
    res.status(HttpStatus.OK).json(numero);
  }

  @Put('numeros/:numeroId')
  @ApiOperation({ summary: 'Update the numero by id' })
  @ApiParam({ name: 'numeroId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK, type: Numero })
  @ApiBody({ type: UpdateNumeroDto, required: true })
  @ApiHeader({ name: 'Token' })
  @UseGuards(AdminGuard)
  async update(
    @Req() req: CustomRequest,
    @Body() updateNumeroDto: UpdateNumeroDto,
    @Res() res: Response,
  ) {
    const result: Numero = await this.numeroService.update(
      req.numero,
      updateNumeroDto,
    );
    res.status(HttpStatus.OK).json(result);
  }

  @Put('numeros/:numeroId/soft-delete')
  @ApiOperation({ summary: 'Soft delete the numero by id' })
  @ApiParam({ name: 'numeroId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK, type: Numero })
  @ApiHeader({ name: 'Token' })
  @UseGuards(AdminGuard)
  async softDelete(@Req() req: CustomRequest, @Res() res: Response) {
    const result = await this.numeroService.softDelete(req.numero);
    res.status(HttpStatus.OK).json(result);
  }

  @Delete('numeros/:numeroId')
  @ApiOperation({ summary: 'Delete the numero by id' })
  @ApiParam({ name: 'numeroId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiHeader({ name: 'Token' })
  @UseGuards(AdminGuard)
  async delete(@Req() req: CustomRequest, @Res() res: Response) {
    await this.numeroService.delete(req.numero);
    res.status(HttpStatus.NO_CONTENT).send();
  }

  @Get('toponymes/:toponymeId/numeros')
  @ApiOperation({ summary: 'Find all numeros which belong to the toponyme' })
  @ApiParam({ name: 'toponymeId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK, type: NumeroPopulate, isArray: true })
  @ApiHeader({ name: 'Token' })
  async findByToponyme(@Req() req: CustomRequest, @Res() res: Response) {
    const numeros: NumeroPopulate[] =
      await this.numeroService.findAllByToponymeId(req.toponyme._id);
    const result = numeros.map((n) => filterSensitiveFields(n, !req.isAdmin));
    res.status(HttpStatus.OK).json(result);
  }

  @Get('voies/:voieId/numeros')
  @ApiOperation({ summary: 'Find all numeros which belong to the voie' })
  @ApiParam({ name: 'numeroId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK, type: Numero, isArray: true })
  @ApiHeader({ name: 'Token' })
  async findByVoie(@Req() req: CustomRequest, @Res() res: Response) {
    const numeros: Numero[] = await this.numeroService.findAllByVoieId(
      req.voie._id,
    );
    const result = numeros.map((n) => filterSensitiveFields(n, !req.isAdmin));
    res.status(HttpStatus.OK).json(result);
  }

  @Post('voies/:voieId/numeros')
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

  @Put('bases_locales/:baseLocaleId/numeros/batch')
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

  @Put('bases_locales/:baseLocaleId/numeros/batch/soft-delete')
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

  @Delete('bases_locales/:baseLocaleId/numeros/batch')
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
}
