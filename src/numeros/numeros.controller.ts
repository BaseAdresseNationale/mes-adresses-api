import { Controller, Get, Param, Res, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ApiParam, ApiTags, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { NumerosService } from './numeros.service';
import { NumeroDto } from './dto/numeros.dto'
import { Numeros } from './numeros.schema'

@ApiTags('numeros')
@Controller('numeros')
export class NumerosController {

  constructor(private numerosService: NumerosService) {}

  @Get(':numeroId')
  @ApiParam({name: 'numeroId', required: true, type: String})
  @ApiResponse({status: 200, type: NumeroDto })
  @ApiHeader({name: 'Token'})
  find(@Res() res: Response): any {

    const numero: Numeros = res.locals.numero
    if (!res.locals.isAdmin) {
      this.numerosService.filterSensitiveFields(numero)
    }

    res.status(HttpStatus.OK).json(numero);
  }
}
