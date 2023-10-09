import { Controller, Get, Put, UseGuards, Res, HttpStatus, Body } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ApiParam, ApiTags, ApiResponse, ApiHeader, ApiBody } from '@nestjs/swagger';
import { AdminGuard } from 'src/guards/admin.guard';
import { NumeroService } from './numero.service';
import { Numero } from './schema/numero.schema'
import { UpdateNumeroDto } from './dto/update.numero.dto'

@ApiTags('numeros')
@Controller('numeros')
export class NumeroController {

  constructor(private numeroService: NumeroService) {}

  @Get(':numeroId')
  @ApiParam({name: 'numeroId', required: true, type: String})
  @ApiResponse({status: 200, type: Numero })
  @ApiHeader({name: 'Token'})
  find(@Res() res: Response): any {

    const numero: Numero = res.locals.numero
    if (!res.locals.isAdmin) {
      this.numeroService.filterSensitiveFields(numero)
    }

    res.status(HttpStatus.OK).json(numero);
  }

  @Put(':numeroId')
  @ApiParam({name: 'numeroId', required: true, type: String})
  @ApiResponse({status: 200, type: Numero })
  @ApiBody({type: UpdateNumeroDto, required: true})
  @ApiHeader({name: 'Token'})
  @UseGuards(AdminGuard)
  update(@Body() updateNumeroDto: UpdateNumeroDto, @Res() res: Response): any {
    res.status(HttpStatus.OK).json(updateNumeroDto);
  }
}
