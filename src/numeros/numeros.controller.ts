import { Controller, Get, Param, Res, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ApiParam, ApiTags, ApiResponse } from '@nestjs/swagger';
import { NumeroDto } from './dto/numeros.dto'

@ApiTags('numeros')
@Controller('numeros')
export class NumerosController {

  @Get(':numeroId')
  @ApiParam({ name: 'numeroId', required: true, type: String })
  @ApiResponse({
    status: 200,
    description: 'Numero trouvé.',
    type: NumeroDto,
  })
  find(@Param('numeroId') numeroId: string, @Res() res: Response): any {
    console.log('res.locals.numero', res.locals.numero)
    res.status(HttpStatus.OK).json(res.locals.numero);
  }
}
