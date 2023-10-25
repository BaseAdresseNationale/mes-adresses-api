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
} from '@nestjs/swagger';
import { CustomRequest } from '@/lib/types/request.type';
import { AdminGuard } from '@/lib/guards/admin.guard';
import { NumeroService } from './numero.service';
import { Numero } from './schema/numero.schema';
import { UpdateNumeroDto } from './dto/update_numero.dto';
import { filterSensitiveFields } from './numero.utils';
import { NumeroPopulate } from '@/modules/numeros/schema/numero.populate';
import { CreateNumeroDto } from '@/modules/numeros/dto/create_numero.dto';

@ApiTags('numeros')
@Controller()
export class NumeroController {
  constructor(private numeroService: NumeroService) {}

  @Get('numeros/:numeroId')
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
  @ApiParam({ name: 'numeroId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK, type: Numero })
  @ApiHeader({ name: 'Token' })
  @UseGuards(AdminGuard)
  async softDelete(@Req() req: CustomRequest, @Res() res: Response) {
    const result = await this.numeroService.softDelete(req.numero);
    res.status(HttpStatus.OK).json(result);
  }

  @Delete('numeros/:numeroId')
  @ApiParam({ name: 'numeroId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiHeader({ name: 'Token' })
  @UseGuards(AdminGuard)
  async delete(@Req() req: CustomRequest, @Res() res: Response) {
    await this.numeroService.delete(req.numero);
    res.status(HttpStatus.NO_CONTENT).send();
  }

  @Get('toponymes/:toponymeId/numeros')
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
