import {
  Controller,
  Post,
  UseGuards,
  Res,
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
import { AdminGuard } from '@/lib//guards/admin.guard';
import { NumeroService } from '@/modules/numeros/numero.service';
import { CreateNumeroDto } from '@/modules/numeros/dto/create_numero.dto';
import { Numero } from '@/modules/numeros/schema/numero.schema';

@ApiTags('voies')
@Controller('voies')
export class VoieController {
  constructor(private numeroService: NumeroService) {}

  @Post(':voieId/numeros')
  @ApiParam({ name: 'voieId', required: true, type: String })
  @ApiBody({ type: CreateNumeroDto, required: true })
  @ApiResponse({ status: 200, type: Numero })
  @ApiHeader({ name: 'Token' })
  @UseGuards(AdminGuard)
  async createNumero(
    @Body() createNumeroDto: CreateNumeroDto,
    @Res() res: Response,
  ) {
    const result: Numero = await this.numeroService.create(
      res.locals.voie,
      createNumeroDto,
    );
    res.status(HttpStatus.OK).json(result);
  }
}
