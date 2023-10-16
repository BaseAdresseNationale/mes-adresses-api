import {
  Controller,
  Get,
  Put,
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
import { AdminGuard } from '@/lib//guards/admin.guard';
import { NumeroService } from './numero.service';
import { Numero } from './schema/numero.schema';
import { UpdateNumeroDto } from './dto/update_numero.dto';
import { filterSensitiveFields } from './numero.utils';

@ApiTags('numeros')
@Controller('numeros')
export class NumeroController {
  constructor(private numeroService: NumeroService) {}

  @Get(':numeroId')
  @ApiParam({ name: 'numeroId', required: true, type: String })
  @ApiResponse({ status: 200, type: Numero })
  @ApiHeader({ name: 'Token' })
  find(@Req() req: CustomRequest, @Res() res: Response): any {
    const numero: Numero = filterSensitiveFields(req.numero, !req.isAdmin);
    res.status(HttpStatus.OK).json(numero);
  }

  @Put(':numeroId')
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
}
