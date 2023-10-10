import { Controller, Get, Put, UseGuards, Res, HttpStatus, Body } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ApiParam, ApiTags, ApiResponse, ApiHeader, ApiBody } from '@nestjs/swagger';
import { AdminGuard } from 'src/guards/admin.guard';
import { NumeroService } from './numero.service';
import { Numero } from './schema/numero.schema'
import { UpdateNumeroDto } from './dto/update_numero.dto'

@ApiTags('numeros')
@Controller('numeros')
export class NumeroController {

  constructor(private numeroService: NumeroService) {}

  @Get(':numeroId')
  @ApiParam({name: 'numeroId', required: true, type: String})
  @ApiResponse({status: 200, type: Numero })
  @ApiHeader({name: 'Token'})
  find(@Res() res: Response): any {

    const numero: Numero = res.locals.numero.filterSensitiveFields(!res.locals.isAdmin)

    res.status(HttpStatus.OK).json(numero);
  }

  @Put(':numeroId')
  @ApiParam({name: 'numeroId', required: true, type: String})
  @ApiResponse({status: 200, type: Numero })
  @ApiBody({type: UpdateNumeroDto, required: true})
  @ApiHeader({name: 'Token'})
  @UseGuards(AdminGuard)
  async update(@Body() updateNumeroDto: UpdateNumeroDto, @Res() res: Response) {
    const result: Numero = await this.numeroService.update(res.locals.numero, updateNumeroDto)
    res.status(HttpStatus.OK).json(result);
  }
}
