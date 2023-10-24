import {
  Controller,
  Get,
  Put,
  Delete,
  UseGuards,
  Res,
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

@ApiTags('numeros')
@Controller()
export class NumeroController {
  constructor(private numeroService: NumeroService) {}

  @Get('numeros/:numeroId')
  @ApiParam({ name: 'numeroId', required: true, type: String })
  @ApiResponse({ status: 200, type: Numero })
  @ApiHeader({ name: 'Token' })
  find(@Req() req: CustomRequest, @Res() res: Response) {
    const numero: Numero = <Numero>(
      filterSensitiveFields(req.numero, !req.isAdmin)
    );
    res.status(HttpStatus.OK).json(numero);
  }

  @Put('numeros/:numeroId')
  @ApiParam({ name: 'numeroId', required: true, type: String })
  @ApiResponse({ status: 200, type: Numero })
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
  @ApiResponse({ status: 200, type: Numero })
  @ApiHeader({ name: 'Token' })
  @UseGuards(AdminGuard)
  async softDelete(@Req() req: CustomRequest, @Res() res: Response) {
    const result = await this.numeroService.softDelete(req.numero);
    res.status(HttpStatus.OK).json(result);
  }

  @Delete('numeros/:numeroId')
  @ApiParam({ name: 'numeroId', required: true, type: String })
  @ApiResponse({ status: 204 })
  @ApiHeader({ name: 'Token' })
  @UseGuards(AdminGuard)
  async delete(@Req() req: CustomRequest, @Res() res: Response) {
    await this.numeroService.delete(req.numero);
    res.status(HttpStatus.NO_CONTENT).send();
  }

  @Get('toponymes/:toponymeId/numeros')
  @ApiParam({ name: 'toponymeId', required: true, type: String })
  @ApiResponse({ status: 201, type: NumeroPopulate, isArray: true })
  @ApiHeader({ name: 'Token' })
  async findByToponyme(@Req() req: CustomRequest, @Res() res: Response) {
    const numeros: NumeroPopulate[] =
      await this.numeroService.findAllByToponymeId(req.toponyme._id);
    const result = numeros.map((n) => filterSensitiveFields(n, !req.isAdmin));
    res.status(HttpStatus.OK).json(result);
  }
}
